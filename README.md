# Pressd website

Laundry pickup and delivery, Lagos. Static site on Netlify, backend on Google Apps Script + Google Sheets, payments on Paystack.

## Folder map

```
/                       index.html (home + booking), order.html (tracking), admin.html, laundry.html
/thank-you/payment/     booking paid  (Paystack lands here, conversion URL for ads)
/thank-you/balance/     balance paid  (second payment after sorting)
/assets/                logos, favicons, images
/css/brand.css          brand kit: colours, type, nav, footer, buttons, fields, cards
/js/config.js           SITE_URL, Apps Script URL, GTM ID, contacts, hero areas  <- edit here
/js/ui.js               shared kit: nav, footer, GTM, ad attribution, API calls, Paystack popup
/js/thank-you.js        logic for both thank-you pages
_redirects              keeps old /thank-you.html links working
```

## Changing the domain

1. `/js/config.js` > `SITE_URL`
2. Apps Script > Project Settings > Script properties > `SITE_URL` (same value)

That's it. Paystack callbacks and email links follow automatically.

## Ad links

| Link | What happens |
| --- | --- |
| `/?area=Gbagada` | Headline locks to "Laundry service in Gbagada", area pre-selected at signup, saved on the order as Landing Area |
| `/#book` | Opens the booking form straight away |
| `/?area=Ikoyi&utm_source=meta&utm_campaign=ikoyi-nov#book` | Both, plus UTM saved on the order |

UTM tags, gclid / fbclid / ttclid and `?area=` are stored in the browser and written to the order row (Attribution columns).

## Conversions

| Moment | URL | dataLayer event |
| --- | --- | --- |
| Booking placed (unpaid) | stays on `/` | `order_created_before_payment` |
| Booking paid | `/thank-you/payment/` | `payment_success` (once per payment) |
| Balance paid | `/thank-you/balance/` | `balance_payment_success` |

Other events: `pickup_modal_open`, `lead_details_saved`, `payment_started`, `care_estimate`, `care_estimate_used`.

## Areas and prices

Both live in the Google Sheet (tabs `Areas` and `Pricing`). Change them there; the site picks them up within 10 minutes. No deploy needed.

## Donut image

Drop the mascot at `/assets/donut.jpg`. Until then the site falls back to the hosted copy.
