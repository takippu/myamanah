import { Resend } from "resend";

export async function sendOtpEmail(to: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "MyAmanah <onboarding@resend.dev>";
  if (!apiKey) {
    console.log(`[DEV OTP] ${to}: ${code}`);
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to,
    subject: "Your MyAmanah OTP code",
    html: `<p>Your verification code is:</p><h2>${code}</h2><p>This code expires in 10 minutes.</p>`,
  });
}

