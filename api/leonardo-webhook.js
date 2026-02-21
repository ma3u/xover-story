/**
 * Leonardo.AI webhook callback endpoint (optional).
 * Use this URL as "Webhook callback URL" when creating an API key if the form requires one.
 * Deploy with: vercel (then use https://<your-project>.vercel.app/api/leonardo-webhook)
 *
 * Leonardo sends POST with type "image_generation.complete" and image URLs in the body.
 * This handler only returns 200; the local script still uses polling to get image URLs.
 */

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const payload = req.body || {};
  const type = payload.type;
  const data = payload.data?.object;

  if (type === "image_generation.complete" && data?.images?.[0]?.url) {
    // Optional: log or store data.id and data.images[0].url
    // For now we only acknowledge receipt
  }

  res.status(200).json({ received: true });
}
