/* =============================================================================
 * PRESSD : site configuration
 * =============================================================================
 * Every page loads this file first. Change a value here and every page
 * picks it up. Nothing else on the site needs editing for a move.
 *
 * Moving to pressdng.com (or any domain): 3 steps, no other file changes.
 *   1. Change SITE_URL below to 'https://pressdng.com/'
 *   2. Apps Script > Project Settings > Script properties > SITE_URL = same value
 *      (Paystack callbacks, email links, logo in emails all follow it)
 *   3. Netlify > Domain management > add pressdng.com as primary domain.
 *      Old pressdng.netlify.app links (sent emails, open Paystack sessions)
 *      then redirect to the new domain automatically, paths kept.
 * Every page link on the site is root-relative (/order.html, /thank-you/...),
 * so nothing else references the domain.
 *
 * Redeployed the Apps Script as a NEW deployment?  Paste the new /exec URL
 * into APPS_SCRIPT_URL. (Using "Manage deployments > Edit > New version"
 * keeps the same URL, so you normally never touch this.)
 * ============================================================================= */

window.PRESSD_CONFIG = {

  /* ---- The one you change ---------------------------------------------- */
  SITE_URL: 'https://pressdng.netlify.app/',

  /* ---- Backend ---------------------------------------------------------- */
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbz_T1KM_6vn_LUkR97DwWdl1RvYVLb3V8TQ_LFOG-upvS1vgEbcjZSV-TxKDcffxoaV/exec',

  /* ---- Tracking --------------------------------------------------------- */
  GTM_ID: 'GTM-NK68TBMQ',

  /* ---- Contact ---------------------------------------------------------- */
  WHATSAPP_URL:  'https://wa.me/2348162373553',
  TELEGRAM_BOT:  'https://t.me/pressdlagosbot',
  TELEGRAM_HANDLE: '@pressdlagosbot',
  SUPPORT_EMAIL: 'pressdonline@gmail.com',   // switch to the Zoho address when it is live (also Script Property SUPPORT_EMAIL)

  /* ---- Hero ------------------------------------------------------------- */
  /* Areas that rotate in the homepage headline: "Laundry service in ___".
     An ad link with ?area=Gbagada locks the headline to that area. */
  HERO_AREAS: ['Ilupeju', 'Gbagada', 'Ikoyi', 'VI'],

  /* ---- Service facts shown across pages --------------------------------- */
  PICKUP_DAYS: 'Tue · Thu · Sat',
  PICKUP_DAYS_LONG: 'Tuesdays, Thursdays, and Saturdays',
  TURNAROUND: '48–72 hrs',

  /* ---- Paths (root-relative). Leave as-is unless you move files. -------- */
  PATHS: {
    HOME:              '/',
    ORDER:             '/order.html',
    THANK_YOU_PAYMENT: '/thank-you/payment/',
    THANK_YOU_BALANCE: '/thank-you/balance/',
    LOGO_LIGHT:        '/assets/logo-light.png',
    LOGO_DARK:         '/assets/logo-dark.png',
    DONUT:             '/assets/donut.jpg',
    DONUT_FALLBACK:    'https://i.ibb.co/tMcvfMQb/donut-laundry-mascot.jpg',
  },
};
