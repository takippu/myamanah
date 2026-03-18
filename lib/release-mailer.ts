import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured.");
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || "MyAmanah <noreply@example.com>";
}

export async function sendResendEmail(args: {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
}) {
  const resend = getResendClient();
  return resend.emails.send({
    from: getFromAddress(),
    to: args.to,
    subject: args.subject,
    text: args.text,
    html: args.html,
  });
}
