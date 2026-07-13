import nodemailer from "nodemailer";

export async function sendEmail(digestMarkdown) {
  const { EMAIL_USER, EMAIL_APP_PASSWORD, EMAIL_TO } = process.env;
  if (!EMAIL_USER || !EMAIL_APP_PASSWORD || !EMAIL_TO) {
    console.log("Skipping email (EMAIL_USER / EMAIL_APP_PASSWORD / EMAIL_TO not fully set).");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail", // change if using a different provider
    auth: { user: EMAIL_USER, pass: EMAIL_APP_PASSWORD },
  });

  await transporter.sendMail({
    from: EMAIL_USER,
    to: EMAIL_TO,
    subject: `Wellbeing Research Briefing — ${new Date().toDateString()}`,
    text: digestMarkdown,
  });

  console.log(`Emailed briefing to ${EMAIL_TO}`);
}
