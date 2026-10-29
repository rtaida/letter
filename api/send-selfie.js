const MAX_PHOTO_BYTES = 1_500_000;

function sendJson(res, status, body) {
  res.status(status).json(body);
}

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  const origin = req.headers.origin;

  if (!allowedOrigin || !origin || origin !== allowedOrigin) {
    return sendJson(res, 403, { error: "This website is not allowed to send photos." });
  }

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  if (!req.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
    return sendJson(res, 415, { error: "A JSON request is required." });
  }

  const photo = req.body?.photo;
  if (typeof photo !== "string") {
    return sendJson(res, 400, { error: "A selfie is required." });
  }

  const match = photo.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) {
    return sendJson(res, 400, { error: "The selfie must be a valid JPEG, PNG, or WebP image." });
  }

  const image = Buffer.from(match[2], "base64");
  if (image.length > MAX_PHOTO_BYTES) {
    return sendJson(res, 413, { error: "The selfie is too large to email. Please retake it." });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const recipient = process.env.RECIPIENT_EMAIL;
  if (!apiKey || !from || !recipient) {
    console.error("Email delivery is missing required server configuration.");
    return sendJson(res, 503, { error: "Email delivery isn’t configured yet." });
  }

  const extension = match[1] === "jpeg" ? "jpg" : match[1];
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: "A little apology keepsake from Baby Jelay",
        text: "Baby Jelay chose to send you this selfie as a keepsake from this moment.",
        attachments: [
          {
            filename: `baby-jelay-selfie.${extension}`,
            content: image.toString("base64"),
          },
        ],
      }),
    });

    if (!response.ok) {
      const providerMessage = await response.text();
      console.error("Email provider rejected the selfie.", {
        status: response.status,
        response: providerMessage.slice(0, 500),
      });
      return sendJson(res, 502, { error: "The email service couldn’t send the selfie. Please try again." });
    }

    return sendJson(res, 200, { sent: true });
  } catch (error) {
    console.error("Email delivery request failed.", error);
    return sendJson(res, 502, { error: "The email service couldn’t be reached. Please try again." });
  }
};
