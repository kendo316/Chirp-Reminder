const { Resend } = require("resend");

let resendClient = null;

function getResendClient(apiKey) {
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

/**
 * Build the HTML email content for a weekly digest.
 */
function buildEmailHtml({ sightings, tip, maintenanceReminder, unsubscribeUrl, userName }) {
  const sightingRows = sightings
    .map(
      (s, i) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e8e0d4;">${i + 1}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e8e0d4;font-weight:600;">${escapeHtml(s.comName)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e8e0d4;font-style:italic;color:#6b7c5e;">${escapeHtml(s.sciName)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e8e0d4;text-align:center;">${s.reportCount} reports</td>
        </tr>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f0e8;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;">

    <!-- Header -->
    <div style="background-color:#2d5016;padding:24px 32px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:28px;letter-spacing:1px;">ChirpReminder</h1>
      <p style="color:#a8c896;margin:4px 0 0;font-size:14px;">Your Weekly Bird Feeding Digest</p>
    </div>

    <!-- Greeting -->
    <div style="padding:24px 32px 16px;">
      <p style="color:#3a3a3a;font-size:16px;line-height:1.6;">
        Good morning! Here's what's happening at feeders in your area this week.
      </p>
    </div>

    <!-- Birds Active This Week -->
    <div style="padding:0 32px 24px;">
      <h2 style="color:#2d5016;font-size:20px;border-bottom:2px solid #a8c896;padding-bottom:8px;">
        Birds Active This Week
      </h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background-color:#f0ebe0;">
            <th style="padding:8px 12px;text-align:left;">#</th>
            <th style="padding:8px 12px;text-align:left;">Species</th>
            <th style="padding:8px 12px;text-align:left;">Scientific Name</th>
            <th style="padding:8px 12px;text-align:center;">Activity</th>
          </tr>
        </thead>
        <tbody>
          ${sightingRows}
        </tbody>
      </table>
      <p style="font-size:12px;color:#888;margin-top:8px;">
        Data sourced from eBird (Cornell Lab of Ornithology) - past 7 days
      </p>
    </div>

    <!-- This Week's Feeding Tip -->
    <div style="padding:0 32px 24px;">
      <h2 style="color:#2d5016;font-size:20px;border-bottom:2px solid #a8c896;padding-bottom:8px;">
        This Week's Feeding Tip
      </h2>
      <div style="background-color:#f7f4ed;border-left:4px solid #6b7c5e;padding:16px;border-radius:0 4px 4px 0;">
        <h3 style="margin:0 0 8px;color:#2d5016;font-size:16px;">${escapeHtml(tip.title)}</h3>
        <p style="margin:0;color:#3a3a3a;font-size:14px;line-height:1.6;">${escapeHtml(tip.content)}</p>
      </div>
    </div>

    <!-- Maintenance Reminder -->
    <div style="padding:0 32px 24px;">
      <h2 style="color:#2d5016;font-size:20px;border-bottom:2px solid #a8c896;padding-bottom:8px;">
        Maintenance Reminder
      </h2>
      <p style="color:#3a3a3a;font-size:14px;line-height:1.6;">
        ${escapeHtml(maintenanceReminder)}
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color:#f0ebe0;padding:20px 32px;text-align:center;border-top:1px solid #d4cdc0;">
      <p style="font-size:12px;color:#888;margin:0 0 8px;">
        You're receiving this because you signed up at ChirpReminder.
      </p>
      <a href="${escapeHtml(unsubscribeUrl)}" style="font-size:12px;color:#6b7c5e;text-decoration:underline;">
        Unsubscribe from these emails
      </a>
      <p style="font-size:11px;color:#aaa;margin:8px 0 0;">
        ChirpReminder &bull; Helping you feed the birds that feed your soul
      </p>
    </div>

  </div>
</body>
</html>`;
}

/**
 * Build a plain-text version of the email for clients that don't render HTML.
 */
function buildEmailText({ sightings, tip, maintenanceReminder, unsubscribeUrl }) {
  const sightingList = sightings
    .map((s, i) => `  ${i + 1}. ${s.comName} (${s.sciName}) - ${s.reportCount} reports`)
    .join("\n");

  return `CHIRPREMINDER - Your Weekly Bird Feeding Digest
================================================

Good morning! Here's what's happening at feeders in your area this week.

BIRDS ACTIVE THIS WEEK
-----------------------
${sightingList}

Data sourced from eBird (Cornell Lab of Ornithology) - past 7 days

THIS WEEK'S FEEDING TIP
------------------------
${tip.title}

${tip.content}

MAINTENANCE REMINDER
--------------------
${maintenanceReminder}

---
You're receiving this because you signed up at ChirpReminder.
Unsubscribe: ${unsubscribeUrl}

ChirpReminder - Helping you feed the birds that feed your soul`;
}

/**
 * Send a digest email to a single subscriber using Resend.
 */
async function sendDigestEmail(apiKey, { to, sightings, tip, maintenanceReminder, unsubscribeUrl }) {
  const client = getResendClient(apiKey);

  const html = buildEmailHtml({ sightings, tip, maintenanceReminder, unsubscribeUrl });
  const text = buildEmailText({ sightings, tip, maintenanceReminder, unsubscribeUrl });

  const { data, error } = await client.emails.send({
    from: "ChirpReminder <digest@chirpreminder.com>",
    to: [to],
    subject: "Your Weekly Bird Feeding Digest",
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
    },
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }

  return data;
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  sendDigestEmail,
  buildEmailHtml,
  buildEmailText,
};
