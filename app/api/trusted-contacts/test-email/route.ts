import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromRequest } from "@/lib/auth";
import { sendResendEmail } from "@/lib/release-mailer";
import { recordReleaseAuditEvent } from "@/lib/release-audit";
import {
  createReleaseToken,
  sha256Hex,
  calculateRetrievalExpiry,
} from "@/lib/release-utils";

function appBaseUrl(): string {
  return process.env.BETTER_AUTH_URL || "http://localhost:3000";
}

/**
 * POST /api/trusted-contacts/test-email
 * Send a REAL test email with working retrieval links to all trusted contacts
 */
export async function POST() {
  const user = await getAuthUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user has a vault backup stored
    const vaultBackup = await prisma.vaultBackup.findUnique({
      where: { userId: user.id },
    });

    if (!vaultBackup) {
      return NextResponse.json(
        { error: "No encrypted vault backup found. Please enable encrypted backup first." },
        { status: 404 }
      );
    }

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

    const now = new Date();
    const expiresAt = calculateRetrievalExpiry(now);
    const loginUrl = `${appBaseUrl()}/login`;

    // Create REAL release tokens and send emails
    const results = await Promise.allSettled(
      releaseChannels.map(async (channel) => {
        if (!channel.releaseEmail) return null;

        try {
          // Create a REAL release token in the database
          const rawToken = createReleaseToken();
          await prisma.releaseRetrievalToken.create({
            data: {
              userId: user.id,
              trustedContactId: channel.trustedContactId,
              tokenHash: sha256Hex(rawToken),
              expiresAt,
            },
          });

          const claimUrl = `${appBaseUrl()}/release/${rawToken}`;

          await recordReleaseAuditEvent({
            userId: user.id,
            trustedContactId: channel.trustedContactId,
            type: "retrieval_token_created",
            metadataJson: {
              expiresAt: expiresAt.toISOString(),
              isTest: true,
            },
          });

          await sendResendEmail({
            to: channel.releaseEmail,
            subject: "[TEST] MyAmanah Secure Retrieval Link",
            text: `[THIS IS A TEST - REAL WORKING LINK]

A MyAmanah encrypted backup test release has been sent to you.

Owner: ${user.email}

🔐 SECURE RETRIEVAL LINK (WORKS FOR 7 DAYS):
${claimUrl}

What you can do with this test link:
1. Click the link to open the secure retrieval page
2. View the release status and expiry information
3. Download the encrypted vault backup (you'll need the owner's recovery key)
4. The owner shared the recovery key separately - you'll need it to decrypt

⚠️ IMPORTANT: This is a TEST release. In a real event:
- The email subject won't say "[TEST]"
- The release happens automatically when the owner misses their check-in
- The same secure process applies

---
MyAmanah - Privacy-first legacy organizer
${loginUrl}`,
            html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1f2937;">
              <!-- Test Banner -->
              <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 16px 20px; border-radius: 12px; margin-bottom: 24px; text-align: center;">
                <p style="margin: 0; font-size: 14px; font-weight: 600; letter-spacing: 0.05em;">🧪 THIS IS A TEST EMAIL</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">This link works for 7 days - testing real retrieval flow</p>
              </div>

              <!-- Header -->
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: linear-gradient(135deg, #059669 0%, #047857 100%); border-radius: 16px; margin: 0 auto 16px auto; text-align: center;">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="40" height="40" style="display: block; margin: 0 auto;">
                    <path d="M24 4L6 12v11.2c0 9.2 7.7 17.8 18 20 10.3-2.2 18-10.8 18-20V12L24 4z" fill="#ffffff"/>
                    <path d="M20 32.4l-7.4-7.4 1.9-1.9 5.5 5.5 11.5-11.5 1.9 1.9L20 32.4z" fill="#059669"/>
                  </svg>
                </div>
                <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">MyAmanah Secure Retrieval</h1>
                <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">Privacy-first legacy organizer</p>
              </div>

              <!-- Content -->
              <div style="background: #f9fafb; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;">
                  A <strong>test release</strong> of a MyAmanah encrypted backup has been sent to you.
                </p>

                <div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 20px; border-left: 4px solid #059669;">
                  <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Vault Owner</p>
                  <p style="margin: 0; font-size: 16px; font-weight: 500; color: #111827;">${user.email}</p>
                </div>

                <!-- REAL Working Retrieval Link -->
                <div style="background: #d1fae5; border: 2px solid #059669; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
                  <p style="margin: 0 0 12px 0; font-size: 12px; color: #065f46; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">🔓 Secure Retrieval Link (REAL - Works for 7 Days)</p>
                  <a href="${claimUrl}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">
                    Open Secure Retrieval Page
                  </a>
                  <p style="margin: 12px 0 0 0; font-size: 12px; color: #065f46;">
                    ⏰ Expires: ${expiresAt.toLocaleDateString('en-US', { dateStyle: 'medium' })}
                  </p>
                </div>

                <!-- What You Can Do -->
                <div style="margin-bottom: 20px;">
                  <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #374151;">What you can do with this test:</p>
                  <ol style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #4b5563;">
                    <li>Click the secure retrieval link above</li>
                    <li>View the release status and expiry information</li>
                    <li>Download the encrypted vault backup</li>
                    <li><strong>Use the owner's recovery key</strong> (shared separately) to decrypt</li>
                  </ol>
                </div>

                <!-- Test vs Real -->
                <div style="background: #fef3c7; border-radius: 10px; padding: 16px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
                  <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #92400e;">⚠️ Test vs. Real Event</p>
                  <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
                    This is a <strong>TEST</strong> - the owner triggered this manually. In a real event, the email won't say "[TEST]" and releases happen automatically when the owner misses their check-in.
                  </p>
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
                  This test verifies the complete retrieval flow works correctly.
                </p>
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                  <a href="${loginUrl}" style="color: #059669; text-decoration: none;">MyAmanah</a> • Privacy-first legacy organizer
                </p>
              </div>
            </div>`,
          });

          await recordReleaseAuditEvent({
            userId: user.id,
            trustedContactId: channel.trustedContactId,
            type: "test_email_sent",
            metadataJson: {
              notifiedEmail: channel.releaseEmail,
              hasRealToken: true,
              expiresAt: expiresAt.toISOString(),
            },
          });

          return {
            email: channel.releaseEmail,
            success: true,
            tokenCreated: true,
            expiresAt: expiresAt.toISOString(),
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
