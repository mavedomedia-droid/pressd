/* =============================================================================
 * PRESSD — Central config
 * =============================================================================
 * All Pressd HTML pages load this file via <script src="pressd-config.js">
 * before their main script. Update values here, every page picks them up.
 *
 * Deploy this to Netlify as /pressd-config.js (root of the site).
 *
 * To rotate the GAS URL after redeploying Apps Script:
 *   1. Get the new /exec URL from Apps Script
 *   2. Update APPS_SCRIPT_URL below
 *   3. Push to Netlify — every page is now using the new URL
 * ============================================================================= */

window.PRESSD_CONFIG = {
  /* Google Apps Script web app /exec URL */
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxRmTvnlG77J-1Dxh_mbYF5AUJiX_p4CIRQR1ZiY813JsGhxbHQuyWDvAFtSo64jR9M/exec',

  /* Paystack public key (safe to expose — it's the publishable key, not the secret) */
  PAYSTACK_PUBLIC_KEY: 'pk_test_64329b33e79d10e1d5679a3e8fc2a09a205a9bce',

  /* Brand bits used across pages */
  WHATSAPP_URL: 'https://wa.me/2348162373553',
  TELEGRAM_BOT: 'https://t.me/pressdlagosbot',
  SUPPORT_EMAIL: 'pressdonline@gmail.com',
};
