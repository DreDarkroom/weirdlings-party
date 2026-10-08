# Shared wishes + feedback backend (optional)

Without this, the sign book and birthday card still work, but wishes only live in each visitor's own browser.
To make the card shared by everyone:

```bash
cd backend
npx wrangler login                                 # opens a browser to authorise Cloudflare (free plan is fine)
npx wrangler kv namespace create WISHES            # copy the printed id into wrangler.toml
npx wrangler secret put ADMIN_TOKEN                # any long random string; needed to delete wishes / read feedback
npx wrangler deploy                                # prints https://weirdlings-wishes.<you>.workers.dev
```
Then set `apiBase` in `js/config.js` to that URL, commit and push.

Moderation: `curl -X DELETE -H "x-admin-token: $TOKEN" "$API/wishes/<id>?to=kerry"`.
Abuse controls: all text is stripped of control characters and `<>`, length-limited, rendered with `textContent`,
rate-limited per IP, and CORS-locked to `ALLOWED_ORIGIN`.
