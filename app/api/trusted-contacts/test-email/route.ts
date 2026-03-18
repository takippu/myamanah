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

    const testUrl = `${appBaseUrl()}/login`;
    
    // Send test email to each contact
    const results = await Promise.allSettled(
      releaseChannels.map(async (channel) => {
        if (!channel.releaseEmail) return null;
        
        try {
          await sendResendEmail({
            to: channel.releaseEmail,
            subject: "[TEST] MyAmanah Trusted Contact Email",
            text: `This is a TEST email from MyAmanah.\n\nYou are registered as a trusted contact for ${user.email}.\n\nIn the event the owner misses their deadman switch check-in, you would receive a secure retrieval link to access their encrypted vault backup.\n\nThis is only a test. No action is required.\n\nYou can login here: ${testUrl}`,
            html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #059669;">[TEST] MyAmanah Trusted Contact Email</h2>
              <p>This is a <strong>TEST</strong> email from MyAmanah.</p>
              <p>You are registered as a trusted contact for <strong>${user.email}</strong>.</p>
              <p>In the event the owner misses their deadman switch check-in, you would receive a secure retrieval link to access their encrypted vault backup.</p>
              <p style="background: #fef3c7; padding: 12px; border-radius: 8px; margin: 20px 0;">
                <strong>This is only a test. No action is required.</strong>
              </p>
              <p><a href="${testUrl}" style="color: #059669;">Login to MyAmanah</a></p>
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
