# Coast Fragrances

Online store for Coast car fragrances.

| Folder | What it is | Tech |
|---|---|---|
| [`backend/`](backend) | Products, cart, orders, payments + the **admin dashboard** at `/app` | Medusa v2.21, Postgres, Redis, Stripe |
| [`storefront/`](storefront) | The customer-facing shop | Next.js 16 (App Router), React 19, Tailwind CSS v4 |

The storefront is built from the Claude Design handoff (Home, Shop, Product, Our Story, bag drawer, Bag, Checkout, Order confirmation).

---

## Deploying to Railway

You'll end up with **four things** in one Railway project: Postgres, Redis, the backend, and the storefront.

### 1. Create the project and databases

1. In Railway: **New Project → Deploy from GitHub repo →** pick `tangobrown/coast`. Railway creates one service; this will be the **backend**. Rename it to `backend` (Settings → name).
2. In the same project: **+ Create → Database → PostgreSQL**.
3. Again: **+ Create → Database → Redis**.

### 2. Configure the backend service

**Settings → Source**
- **Root Directory:** `/backend`

**Settings → Config-as-code** (optional)
- **Railway Config File:** `/backend/railway.json` adds a health check. Railway's default `npm run build` / `npm start` already run the right production commands, so the backend works without it.

**Settings → Networking** → **Generate Domain** (gives you something like `backend-production-xxxx.up.railway.app`).

**Variables** → switch to the **Raw Editor** and paste this, then fill in the three `CHANGE_ME` values:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}?family=0
JWT_SECRET=CHANGE_ME_long_random_string
COOKIE_SECRET=CHANGE_ME_another_long_random_string
MEDUSA_BACKEND_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
ADMIN_CORS=https://${{RAILWAY_PUBLIC_DOMAIN}}
AUTH_CORS=https://${{RAILWAY_PUBLIC_DOMAIN}}
STORE_CORS=https://${{storefront.RAILWAY_PUBLIC_DOMAIN}}
MEDUSA_ADMIN_EMAIL=you@example.com
MEDUSA_ADMIN_PASSWORD=CHANGE_ME_admin_password
```

> `?family=0` lets the Redis client connect over Railway's private network.
>
> For the random secrets, any long string works. For example, run `openssl rand -hex 32` twice, or mash the keyboard for about 40 characters.

Deploy. The **first** deploy automatically:
- sets up the database tables
- creates the UK region (GBP, VAT-inclusive), delivery options, the Hang / Stick / Clip collections and all 9 scents
- creates your admin login from `MEDUSA_ADMIN_EMAIL` / `MEDUSA_ADMIN_PASSWORD`
- prints the **storefront publishable key** in the deploy logs. Look for `[bootstrap] Storefront publishable key: pk_…`

Later deploys skip the seeding, so your edits in the admin are never overwritten.

**Admin dashboard:** `https://<backend-domain>/app`

### 3. Add the storefront service

1. **+ Create → GitHub Repo →** `tangobrown/coast` again. Rename it to `storefront`. The name matters because the backend's `STORE_CORS` refers to it.
2. **Settings → Source → Root Directory:** `/storefront`
3. **Settings → Config-as-code → Railway Config File:** `/storefront/railway.json` (optional; adds a health check)
4. **Settings → Networking → Generate Domain.**
5. **Variables** (Raw Editor):

```env
MEDUSA_BACKEND_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}
MEDUSA_PUBLISHABLE_KEY=pk_paste_from_backend_deploy_logs
STRIPE_PUBLISHABLE_KEY=
ALLOW_TEST_ORDERS=true
```

`ALLOW_TEST_ORDERS=true` lets you click through checkout and place **unpaid test orders** before Stripe is connected. Set it to `false` (or delete it) before you launch.

### 4. When you're ready for Stripe

1. In the Stripe Dashboard → **Developers → API keys**, copy the **Secret key** (`sk_…`) and **Publishable key** (`pk_…`). Use the *test* keys first.
2. **Backend** variables: add `STRIPE_API_KEY=sk_…`
3. **Storefront** variables: set `STRIPE_PUBLISHABLE_KEY=pk_…` and `ALLOW_TEST_ORDERS=false`
4. **Webhook** (so Medusa hears about payments that finish after the shopper leaves the page): Stripe → **Developers → Webhooks → Add endpoint**
   - URL: `https://<backend-domain>/hooks/payment/stripe_stripe`
   - Events: `payment_intent.succeeded`, `payment_intent.amount_capturable_updated`, `payment_intent.payment_failed`, `payment_intent.partially_funded`
   - Copy the signing secret (`whsec_…`) into the **backend** as `STRIPE_WEBHOOK_SECRET`.
5. **Apple Pay / Google Pay:** Stripe → **Settings → Payment method domains** → add your storefront domain.

On the next backend deploy, the UK region automatically switches to Stripe as its only payment method. The unpaid test-order option is removed, so nobody can check out without paying.

Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

### 5. Custom domain

| Address | Railway service | Port |
|---|---|---|
| `coastfragrances.co.uk` | storefront | 8080 |
| `www.coastfragrances.co.uk` | storefront (redirects to the bare domain) | 8080 |
| `api.coastfragrances.co.uk` | backend (admin at `/app`, Stripe webhooks) | 8080 |

Add each under the service's **Settings → Networking → Custom Domain**, then create the CNAME (and any TXT) records Railway shows in Cloudflare with **DNS only** (grey cloud). Once they're verified, set on the **backend**:

```env
MEDUSA_BACKEND_URL=https://api.coastfragrances.co.uk
ADMIN_CORS=https://api.coastfragrances.co.uk
AUTH_CORS=https://api.coastfragrances.co.uk
STORE_CORS=https://coastfragrances.co.uk,https://www.coastfragrances.co.uk
```

and point the Stripe webhook at `https://api.coastfragrances.co.uk/hooks/payment/stripe_stripe`.

### 6. Email (Postmark)

1. Postmark: create a server, verify the `coastfragrances.co.uk` domain (DKIM + Return-Path DNS records), request account approval.
2. **Backend** variables:
   ```env
   POSTMARK_SERVER_TOKEN=...
   EMAIL_FROM=Coast <hello@coastfragrances.co.uk>
   ```
Without a token, emails are only written to the backend logs. Emails sent today: order confirmation.

## Customer accounts & refill subscriptions

**Accounts:** customers can sign up, log in, reset a forgotten password (emailed via Postmark) and see their orders, details and delivery address at `/account`. Guest checkout still works for one-off orders.

**Subscriptions (refills only):**
- On any refill, shoppers can choose **Subscribe & save 5%** and a delivery frequency of every **4, 6 or 8 weeks** (default 6).
- The first refill is paid in the normal checkout, so it can share a bag with one-off items. Normal delivery rules apply to that first order. A subscription needs an account, so checkout asks guests to log in or sign up.
- Stripe saves the card during that payment. The backend then charges it automatically for each refill: an hourly job (`src/jobs/renew-subscriptions.ts`) creates a normal, paid order in the admin with **free delivery** ("Subscriber delivery · Royal Mail") and emails the usual order confirmation.
- If a payment fails, the customer is emailed and the subscription shows "Payment needed". It retries every 3 days (up to 3 attempts), and the customer can update their card or retry from their account.
- Customers manage everything under **Account → Subscriptions**: skip the next refill, pause/resume, change scent, change frequency, update card, cancel.
- The subscriber price is always 5% off the refill's *current* price, so changing a refill price in the admin changes future renewals too.

**Useful commands (backend):**
- `npm run renew-subscriptions` runs the renewal job immediately instead of waiting for the hour.
- Without `STRIPE_API_KEY` (local development), renewals use a test mode that pretends to charge successfully.

**Optional backend variable:** `STOREFRONT_URL` (defaults to `https://coastfragrances.co.uk`) is used for links in emails.

## Everyday tasks

**Change products, prices, copy:** Admin → Products. Scent notes live in each product's **Metadata**: `notes_top`, `notes_heart`, `notes_base`, `short_notes`. Best-sellers are products with the `bestseller` tag (ordered by `bestseller_rank` metadata).

**Line copy (Hang / Stick / Clip):** Admin → Products → Collections → Metadata: `format`, `life`, `intro`, `desc`, `how_to_use`, `sort`.

**Product photos:** upload them per product in the admin. The first image is used on cards; the first four make up the product gallery.
> Uploads are currently stored on the backend's disk, which Railway **wipes on every redeploy**. Before adding real photography, set up S3 or Cloudflare R2 file storage (a small config change in `backend/medusa-config.ts`).

**Editorial images** (home hero, line rows, Our Story): put files in `storefront/public/images/` and set their paths in [`storefront/src/lib/site-images.ts`](storefront/src/lib/site-images.ts).

**Announcement bar:** set `NEXT_PUBLIC_ANNOUNCEMENT` on the storefront (then redeploy).

**Discount codes:** Admin → Promotions. They work in the checkout's "Discount code" box.

**Delivery prices:** Admin → Settings → Locations & Shipping. Standard is £3.95, dropping to £0 when the item total is £30 or more (a price rule on the Standard option).

---

## Local development

Requires Node 22, Postgres and Redis.

```bash
# Backend
cd backend
cp .env.template .env        # fill in DATABASE_URL etc.
npm install
npx medusa db:migrate
npm run bootstrap            # seeds the store, creates admin, prints publishable key
npm run dev                  # http://localhost:9000  (admin at /app)

# Storefront (new terminal)
cd storefront
cp .env.template .env        # paste the publishable key
npm install
npm run dev                  # http://localhost:8000
```

---

## Notes and decisions

- **Prices include VAT.** The UK tax region uses 20% VAT, and prices are tax-inclusive, so £16 on the site is £16 at checkout. If you're not VAT-registered yet, set the rate to 0% in Admin → Settings → Tax Regions. Prices won't change.
- **Accounts are optional** for one-off orders, and required for subscriptions.
- **PayPal dropped.** The express row offers Apple Pay and Google Pay through Stripe.
- **Emails via Postmark.** Order confirmations are sent on every order. The refill-reminder opt-in is saved on each order (`metadata.refill_reminders`).
- **Not done yet:** image storage (see above), refill reminder emails for non-subscribers.
