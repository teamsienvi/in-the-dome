"use strict";
const crypto = require("crypto");
const https = require("https");

function hmac(key, str) {
  return crypto.createHmac("sha256", key).update(str, "utf8").digest();
}

function sha256Hex(str) {
  return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}

function getSigningKey(secretKey, dateStamp, region, service) {
  const kDate = hmac("AWS4" + secretKey, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sendSesEmail({ toEmail, fromEmail, replyTo, subject, htmlBody, textBody, accessKey, secretKey, region }) {
  const host = `email.${region}.amazonaws.com`;
  const params = new URLSearchParams();
  params.append("Action", "SendEmail");
  params.append("Version", "2010-12-01");
  params.append("Source", `In the Dome Website <${fromEmail}>`);
  params.append("Destination.ToAddresses.member.1", toEmail);
  params.append("ReplyToAddresses.member.1", replyTo);
  params.append("Message.Subject.Data", subject);
  params.append("Message.Subject.Charset", "UTF-8");
  params.append("Message.Body.Html.Data", htmlBody);
  params.append("Message.Body.Html.Charset", "UTF-8");
  params.append("Message.Body.Text.Data", textBody);
  params.append("Message.Body.Text.Charset", "UTF-8");

  const body = params.toString();
  const now = new Date();
  const amzdate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzdate.slice(0, 8);

  const canonicalHeaders = `content-type:application/x-www-form-urlencoded\nhost:${host}\nx-amz-date:${amzdate}\n`;
  const signedHeaders = "content-type;host;x-amz-date";
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${sha256Hex(body)}`;
  const credentialScope = `${dateStamp}/${region}/ses/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzdate}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`;
  const signingKey = getSigningKey(secretKey, dateStamp, region, "ses");
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");
  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: host,
        path: "/",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Host: host,
          "x-amz-date": amzdate,
          Authorization: authHeader,
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: 10000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const m = data.match(/<MessageId>(.*?)<\/MessageId>/);
            resolve({ ok: true, messageId: m ? m[1] : undefined });
          } else {
            resolve({ ok: false, error: `Email service returned HTTP ${res.statusCode}` });
          }
        });
      }
    );
    req.on("error", (err) => resolve({ ok: false, error: err.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, error: "Email delivery timed out" });
    });
    req.write(body);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  let payload = req.body;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return res.status(400).json({ ok: false, error: "Invalid request payload" });
    }
  }
  payload = payload || {};

  // Honeypot check against automated bots
  if (payload.website_hp && String(payload.website_hp).trim() !== "") {
    return res.status(200).json({ ok: true });
  }

  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim();
  const company = String(payload.company || "").trim();
  const phone = String(payload.phone || "").trim();
  const message = String(payload.message || "").trim();

  if (name.length < 2 || name.length > 120) {
    return res.status(400).json({ ok: false, error: "Please enter your name." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    return res.status(400).json({ ok: false, error: "Please enter a valid email address." });
  }
  if (company.length < 1 || company.length > 140) {
    return res.status(400).json({ ok: false, error: "Please enter your company or brand name." });
  }
  if (phone.length > 40) {
    return res.status(400).json({ ok: false, error: "Phone number is too long." });
  }
  if (message.length < 5 || message.length > 3000) {
    return res.status(400).json({ ok: false, error: "Please include a brief note about your sponsorship inquiry." });
  }

  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || "us-east-1";
  const fromEmail = process.env.SES_FROM_EMAIL;
  const toEmail = process.env.SPONSOR_TO_EMAIL || "inthedomepod@gmail.com";

  if (!accessKey || !secretKey || !fromEmail) {
    return res.status(503).json({ ok: false, error: "Email delivery is not configured." });
  }

  const subject = `New Sponsorship Inquiry: ${company} (${name})`;
  const submittedAt = new Date().toUTCString();

  const htmlBody = `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#101114;color:#f7f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#191b20;border:1px solid rgba(255,255,255,0.14);border-top:4px solid #c8102e;border-radius:8px;padding:28px;">
    <div style="color:#f1be48;font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px;">In the Dome · Sponsorship Inquiry</div>
    <h1 style="margin:0 0 18px;font-size:22px;color:#ffffff;">${escapeHtml(company)}</h1>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
      <tr><td style="padding:8px 0;color:#c3c5ca;width:120px;"><strong>Contact</strong></td><td style="padding:8px 0;color:#ffffff;">${escapeHtml(name)}</td></tr>
      <tr><td style="padding:8px 0;color:#c3c5ca;"><strong>Email</strong></td><td style="padding:8px 0;"><a href="mailto:${escapeHtml(email)}" style="color:#f1be48;">${escapeHtml(email)}</a></td></tr>
      ${phone ? `<tr><td style="padding:8px 0;color:#c3c5ca;"><strong>Phone</strong></td><td style="padding:8px 0;color:#ffffff;">${escapeHtml(phone)}</td></tr>` : ""}
      <tr><td style="padding:8px 0;color:#c3c5ca;"><strong>Submitted</strong></td><td style="padding:8px 0;color:#c3c5ca;">${escapeHtml(submittedAt)}</td></tr>
    </table>
    <div style="background:#101114;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:16px;">
      <div style="color:#f1be48;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Message</div>
      <div style="color:#f7f5f1;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(message)}</div>
    </div>
    <p style="margin:18px 0 0;color:#c3c5ca;font-size:12px;">Hit <strong>Reply</strong> in Gmail to respond directly to ${escapeHtml(name)} (${escapeHtml(email)}).</p>
  </div>
</body>
</html>`;

  const textBody = [
    "IN THE DOME — NEW SPONSORSHIP INQUIRY",
    "--------------------------------------",
    `Company / Brand: ${company}`,
    `Contact Name:    ${name}`,
    `Email:           ${email}`,
    phone ? `Phone:           ${phone}` : null,
    `Submitted:       ${submittedAt}`,
    "",
    "Message:",
    message,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const result = await sendSesEmail({
    toEmail,
    fromEmail,
    replyTo: email,
    subject,
    htmlBody,
    textBody,
    accessKey,
    secretKey,
    region,
  });

  if (!result.ok) {
    return res.status(502).json({ ok: false, error: "Could not send inquiry right now. Please email inthedomepod@gmail.com directly." });
  }

  return res.status(200).json({ ok: true });
};
