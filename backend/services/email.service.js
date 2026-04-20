/**
 * Email delivery via Nodemailer.
 * Configure SMTP_* or MAIL_* env vars; if missing, logs payload in development.
 */
const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');

function createTransport() {
  const host = process.env.SMTP_HOST || process.env.MAIL_HOST;
  const port = Number(process.env.SMTP_PORT || process.env.MAIL_PORT || 587);
  const user = process.env.SMTP_USER || process.env.MAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.MAIL_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const transporter = createTransport();

/**
 * @param {{ to: string, subject: string, text?: string, html?: string }} opts
 */
async function sendMail(opts) {
  const from = process.env.MAIL_FROM || process.env.SMTP_FROM || '"Events App" <noreply@localhost>';

  if (!transporter) {
    logger.warn('Email not configured (SMTP_* / MAIL_* missing). Message not sent.', {
      to: opts.to,
      subject: opts.subject,
    });
    // eslint-disable-next-line no-console
    const body = opts.text || opts.html || '';
    console.log(
      '\n--- EMAIL (dev fallback) ---\nTo: %s\nSubject: %s\n\n%s\n---\n',
      opts.to,
      opts.subject,
      body,
    );
    return { sent: false, devLog: true };
  }

  await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });

  logger.info('Email sent', { to: opts.to, subject: opts.subject });
  return { sent: true };
}

/**
 * Password reset link email (token is the raw secret; never log in production logs).
 */
async function sendPasswordResetEmail(to, resetUrl) {
  const subject = 'Reset your password';
  const text = `You requested a password reset.\n\nOpen this link (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, ignore this email.`;
  const html = `<p>You requested a password reset.</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in 1 hour.</p>`;
  return sendMail({ to, subject, text, html });
}

module.exports = {
  sendMail,
  sendPasswordResetEmail,
};
