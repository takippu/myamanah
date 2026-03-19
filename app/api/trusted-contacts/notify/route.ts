import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromRequest } from "@/lib/auth";
import { sendResendEmail } from "@/lib/release-mailer";
import { recordReleaseAuditEvent } from "@/lib/release-audit";

function appBaseUrl(): string {
  return process.env.BETTER_AUTH_URL || "http://localhost:3000";
}

const RATE_LIMIT_HOURS = 5;
const RATE_LIMIT_MS = RATE_LIMIT_HOURS * 60 * 60 * 1000;

/**
 * POST /api/trusted-contacts/notify
 * Send a notification email to a specific trusted contact
 * Rate limited: once per 5 hours per trusted contact
 */
export async function POST(req: Request) {
  const user = await getAuthUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { contactId, email, name } = body;

  if (!email || !contactId) {
    return NextResponse.json(
      { error: "Email and contact ID are required" },
      { status: 400 }
    );
  }

  try {
    // Check rate limit - get most recent notification to this contact
    const recentNotification = await prisma.releaseAuditEvent.findFirst({
      where: {
        userId: user.id,
        trustedContactId: contactId,
        type: "test_email_sent",
      },
      orderBy: {
        occurredAt: "desc",
      },
    });

    if (recentNotification) {
      const lastSent = new Date(recentNotification.occurredAt).getTime();
      const now = Date.now();
      const timeSince = now - lastSent;

      if (timeSince < RATE_LIMIT_MS) {
        const hoursRemaining = Math.ceil((RATE_LIMIT_MS - timeSince) / (60 * 60 * 1000));
        const minutesRemaining = Math.ceil((RATE_LIMIT_MS - timeSince) / (60 * 1000));
        
        return NextResponse.json(
          { 
            error: `Please wait before sending another notification.`,
            rateLimit: {
              hoursRemaining,
              minutesRemaining,
              lastSentAt: recentNotification.occurredAt,
            }
          },
          { status: 429 }
        );
      }
    }
    const loginUrl = `${appBaseUrl()}/login`;
    
    await sendResendEmail({
      to: email,
      subject: "You've Been Added as a Trusted Contact on MyAmanah",
      text: `Dear ${name || "Trusted Contact"},

${user.name || user.email} has added you as a trusted contact on MyAmanah (amanah.trlabs.my).

What this means:
- MyAmanah is a privacy-first legacy organizer that helps people prepare their important information for emergencies
- You have been chosen as someone who would receive access to their encrypted vault if they miss their regular check-in (deadman switch)
- You will ONLY receive an email if the owner misses their check-in for an extended period
- You will need the owner's recovery key (shared separately) to decrypt any backup

No action is required from you at this time. This is simply a courtesy notification so you're aware you've been chosen.

If you have questions, please contact ${user.name || user.email} directly.

---
MyAmanah - Privacy-first legacy organizer
${loginUrl}`,
      html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1f2937;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: linear-gradient(135deg, #059669 0%, #047857 100%); border-radius: 16px; margin-bottom: 16px;">
            <span style="font-size: 32px;">🛡️</span>
          </div>
          <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #111827;">You've Been Added as a Trusted Contact</h1>
        </div>

        <!-- Content -->
        <div style="background: #f9fafb; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
          <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6;">
            <strong>${user.name || user.email}</strong> has added you as a trusted contact on <strong>MyAmanah</strong> (amanah.trlabs.my).
          </p>

          <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #059669;">
            <p style="margin: 0 0 12px 0; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">What is MyAmanah?</p>
            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #374151;">
              A privacy-first legacy organizer that helps people prepare their important information for emergencies.
            </p>
          </div>

          <p style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #111827;">What this means for you:</p>
          
          <ul style="margin: 0 0 20px 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #4b5563;">
            <li>You have been chosen as someone who would receive access to their encrypted vault if they miss their regular check-in</li>
            <li>You will <strong>ONLY</strong> receive an email if the owner misses their check-in for an extended period (deadman switch)</li>
            <li>You will need the owner's <strong>recovery key</strong> (shared separately) to decrypt any backup</li>
            <li>MyAmanah never sends the recovery key — the owner must share it with you through a secure channel</li>
          </ul>

          <div style="background: #e0f2fe; border-radius: 10px; padding: 16px; border-left: 4px solid #0284c7;">
            <p style="margin: 0; font-size: 13px; color: #0369a1; line-height: 1.5;">
              <strong>ℹ️ No action is required</strong> from you at this time. This is simply a courtesy notification so you're aware you've been chosen.
            </p>
          </div>
        </div>

        <!-- Contact Info -->
        <div style="background: #f3f4f6; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 13px; color: #6b7280;">
            If you have questions, please contact <strong>${user.name || user.email}</strong> directly.
          </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            MyAmanah • Privacy-first legacy organizer<br>
            <a href="${loginUrl}" style="color: #059669; text-decoration: none;">amanah.trlabs.my</a>
          </p>
        </div>
      </div>`,
    });

    // Record audit event
    await recordReleaseAuditEvent({
      userId: user.id,
      trustedContactId: contactId,
      type: "test_email_sent", // Reusing this type or could create a new one
      metadataJson: { 
        type: "contact_notification", 
        notifiedEmail: email,
        notifiedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${email}`,
    });
  } catch (error) {
    console.error("Notify contact error:", error);
    const errorMsg = error instanceof Error ? error.message : "Failed to send notification";
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
