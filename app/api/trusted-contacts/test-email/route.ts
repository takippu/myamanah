import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromRequest } from "@/lib/auth";
import { sendResendEmail } from "@/lib/release-mailer";
import { recordReleaseAuditEvent } from "@/lib/release-audit";

function appBaseUrl(): string {
  return process.env.BETTER_AUTH_URL || "http://localhost:3000";
}

/**
 * POST /api/trusted-contacts/test-email
 * Send a test email to all trusted contacts with release channels
 */
export async function POST() {
  const user = await getAuthUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all trusted contacts with release channels for this user
    const releaseChannels = await prisma.trustedContactReleaseChannel.findMany({
      where: { userId: user.id },
    });

    if (releaseChannels.length === 0) {
      return NextResponse.json(
        { error: "No trusted contacts with release emails found" },
        { status: 404 }
      );
    }

    // Generate a test token (for demonstration - won't actually work)
    const testToken = "TEST_" + Math.random().toString(36).substring(2, 15);
    const claimUrl = `${appBaseUrl()}/release/${testToken}`;
    const loginUrl = `${appBaseUrl()}/login`;
    
    // Send test email to each contact
    const results = await Promise.allSettled(
      releaseChannels.map(async (channel) => {
        if (!channel.releaseEmail) return null;
        
        try {
          await sendResendEmail({
            to: channel.releaseEmail,
            subject: "[TEST] MyAmanah Secure Retrieval Link",
            text: `[THIS IS A TEST EMAIL - NO ACTION REQUIRED]

A MyAmanah encrypted backup has been released to you.

Owner: ${user.email}

If this were a real deadman switch event, you would receive a secure retrieval link like this:
${claimUrl}

What happens next (in a real event):
1. Click the secure retrieval link above
2. You will need the owner's recovery key, shared separately, to open the backup
3. The link expires in 7 days for security

This is only a test to verify your email configuration is working correctly. No action is required.

---
MyAmanah - Privacy-first legacy organizer
${loginUrl}`,
            html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1f2937;">
              <!-- Test Banner -->
              <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 16px 20px; border-radius: 12px; margin-bottom: 24px; text-align: center;">
                <p style="margin: 0; font-size: 14px; font-weight: 600; letter-spacing: 0.05em;">🧪 THIS IS A TEST EMAIL</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">No action required - testing deadman switch configuration</p>
              </div>

              <!-- Header -->
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: linear-gradient(135deg, #059669 0%, #047857 100%); border-radius: 16px; margin-bottom: 16px;">
                  <span style="font-size: 32px;">🛡️</span>
                </div>
                <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">MyAmanah Secure Retrieval</h1>
                <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">Privacy-first legacy organizer</p>
              </div>

              <!-- Content -->
              <div style="background: #f9fafb; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;">
                  A MyAmanah encrypted backup has been <strong>released to you</strong>.
                </p>
                
                <div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 20px; border-left: 4px solid #059669;">
                  <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Vault Owner</p>
                  <p style="margin: 0; font-size: 16px; font-weight: 500; color: #111827;">${user.email}</p>
                </div>

                <!-- Simulated Retrieval Link -->
                <div style="background: #fef3c7; border: 2px dashed #f59e0b; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
                  <p style="margin: 0 0 12px 0; font-size: 12px; color: #92400e; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Simulated Retrieval Link (Test Only)</p>
                  <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">
                    Open Secure Retrieval Page
                  </a>
                  <p style="margin: 12px 0 0 0; font-size: 12px; color: #92400e;">
                    ⏰ In a real event, this link would expire in 7 days
                  </p>
                </div>

                <!-- What Happens Next -->
                <div style="margin-bottom: 20px;">
                  <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #374151;">What happens next (in a real event):</p>
                  <ol style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #4b5563;">
                    <li>Click the secure retrieval link above</li>
                    <li>You will need the <strong>owner's recovery key</strong>, shared separately, to open the backup</li>
                    <li>Download the encrypted vault backup file</li>
                    <li>Use the recovery key to decrypt and access the contents</li>
                  </ol>
                </div>

                <!-- Important Note -->
                <div style="background: #fee2e2; border-radius: 10px; padding: 16px; border-left: 4px solid #ef4444;">
                  <p style="margin: 0; font-size: 13px; color: #991b1b; line-height: 1.5;">
                    <strong>🔐 Important:</strong> MyAmanah never sends the recovery key. The vault owner must share it with you separately through a secure channel.
                  </p>
                </div>
              </div>

              <!-- Footer -->
              <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af;">
                  This is a test email to verify your trusted contact configuration.
                </p>
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                  <a href="${loginUrl}" style="color: #059669; text-decoration: none;">MyAmanah</a> • Privacy-first legacy organizer
                </p>
              </div>
            </div>`,
          });
          
          return {
            email: channel.releaseEmail,
            success: true,
          };
        } catch (error) {
          return {
            email: channel.releaseEmail,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    // Record audit event
    await recordReleaseAuditEvent({
      userId: user.id,
      type: "test_email_sent",
    });

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value?.success
    ).length;
    const failed = results.length - successful;

    return NextResponse.json({
      success: true,
      message: `Test emails sent: ${successful} successful, ${failed} failed`,
      total: releaseChannels.length,
      successful,
      failed,
      details: results.map(r => r.status === "fulfilled" ? r.value : null).filter(Boolean),
    });
  } catch (error) {
    console.error("Test email error:", error);
    return NextResponse.json(
      { error: "Failed to send test emails" },
      { status: 500 }
    );
  }
}
