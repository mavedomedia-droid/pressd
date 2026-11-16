/* =============================================================================
 * PRESSD : thank-you pages logic
 * Used by /thank-you/payment/ (booking paid) and /thank-you/balance/ (balance paid).
 * The page sets <main id="ty-root" data-mode="payment|balance">.
 *
 * Paystack lands here with ?order=<id>&reference=<ref>&trxref=<ref>.
 * The page confirms the payment server-side (Apps Script verifies with
 * Paystack), then renders. Conversion event fires once per payment.
 * ============================================================================= */
(function () {
  'use strict';
  var root = document.getElementById('ty-root');
  var mode = root.getAttribute('data-mode') || 'payment';
  var P = Pressd.paths, CFG = Pressd.cfg, esc = Pressd.esc, fmtNaira = Pressd.fmtNaira;

  var q = new URLSearchParams(location.search);
  var ref = q.get('reference') || q.get('trxref') || '';
  var orderId = (q.get('order') || q.get('id') || ref || '').toUpperCase().replace(/-2$/, '').split('-')[0];

  /* Old links: a balance payment that landed on the booking page */
  if (mode === 'payment' && /-2$/.test(ref)) {
    location.replace((P.THANK_YOU_BALANCE || '/thank-you/balance/') + location.search);
    return;
  }

  var ICON = {
    tick: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    warn: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>',
    info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01" stroke-linecap="round"/></svg>',
    tg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295l.213-3.053 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.643.135-.953l11.566-4.458c.538-.196 1.006.128.832.938z"/></svg>',
  };
  var orderUrl = (P.ORDER || '/order.html') + '?id=' + encodeURIComponent(orderId);

  function stateBlock(icon, title, text, buttons) {
    root.innerHTML = '<div class="state"><div class="state-icon' + (icon === 'warn' ? ' warn' : '') + '">' +
      (icon === 'spin' ? '<span class="spinner"></span>' : ICON[icon] || '') + '</div>' +
      '<h2>' + title + '</h2><p>' + text + '</p>' + (buttons ? '<div class="btn-row">' + buttons + '</div>' : '') + '</div>';
  }
  function kv(k, v, cls) { return '<div class="kv' + (cls ? ' ' + cls : '') + '"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>'; }
  function helpLinks() {
    return '<p class="help">Questions? <a href="' + esc(CFG.WHATSAPP_URL) + '" target="_blank" rel="noopener">WhatsApp us</a>' +
      '<span class="dot">·</span><a href="mailto:' + esc(CFG.SUPPORT_EMAIL) + '">Email us</a></p>';
  }

  /* ---------- Conversion event, once per payment ---------- */
  function fireConversion(o) {
    var key = 'pressd_conv_' + mode + '_' + (ref || o.orderId);
    if (Pressd.store.get(key)) return;
    Pressd.store.set(key, 1);
    var value = mode === 'balance' ? Math.max(0, o.finalLaundryCost - o.additionalCostPaid) : o.bookingTotal;
    Pressd.track(mode === 'balance' ? 'balance_payment_success' : 'payment_success', {
      order_id: o.orderId, transaction_id: ref || o.orderId, value: value, currency: 'NGN',
      pickup_zone: o.zone, pickup_area: o.area, pickup_only: o.pickupOnly,
    });
  }

  /* ---------- Success views ---------- */
  function renderPaid(o) {
    var pins =
      '<div class="card"><div class="card-title">Your PINs</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;text-align:center;">' +
        '<div style="background:var(--brand-cream-deep);border-radius:16px;padding:18px;"><div class="card-title" style="margin:0 0 6px;">Pickup PIN</div><div style="font-size:30px;font-weight:600;color:var(--brand-primary);letter-spacing:.08em;">' + esc(o.pickupPin) + '</div></div>' +
        '<div style="background:var(--brand-cream-deep);border-radius:16px;padding:18px;"><div class="card-title" style="margin:0 0 6px;">Delivery PIN</div><div style="font-size:30px;font-weight:600;color:var(--brand-primary);letter-spacing:.08em;">' + esc(o.deliveryPin) + '</div></div>' +
      '</div><p style="font-size:13px;color:var(--brand-muted);margin:12px 0 0;text-align:center;">Share each PIN only when the rider is with you. They are also in your email.</p></div>';

    root.innerHTML =
      '<div class="success-icon">' + ICON.tick + '</div>' +
      '<h1 class="page-headline">Pickup <em>locked in.</em></h1>' +
      '<p class="page-lede">' + (o.name ? 'Thanks ' + esc(o.name) + '. ' : '') + 'Payment received. A rider will message you on WhatsApp the day before pickup.</p>' +
      '<div class="order-id-box"><div class="order-id-label">Order ID</div><div class="order-id-value">' + esc(o.orderId) + '</div></div>' +
      '<div class="card">' +
        kv('Pickup window', esc(Pressd.fmtWindow(o.pickupWindow)), 'hl') +
        kv('Area', esc([o.area, o.zone === 'island' ? 'Island' : 'Mainland'].filter(Boolean).join(' · '))) +
        kv('Pickup days', esc(CFG.PICKUP_DAYS)) +
        kv('Delivery', esc(CFG.TURNAROUND) + ' after pickup') +
        kv('Amount paid', fmtNaira(o.bookingTotal)) +
        (ref ? kv('Payment ref', '<span style="font-family:var(--font-mono);font-size:12px;">' + esc(ref) + '</span>') : '') +
      '</div>' +
      pins +
      (o.pickupOnly ? '<div class="callout callout-warn">' + ICON.info + '<div><strong>You chose pickup only.</strong> After we sort your laundry, we email you the cost with a payment link.</div></div>' : '') +
      '<div class="next-card"><h3>What happens next</h3><ul>' +
        '<li>Your receipt and PINs are in your inbox</li>' +
        '<li>A rider messages you the day before pickup</li>' +
        '<li>Have your laundry ready by the start of your window</li>' +
        '<li>We deliver back to the same address within ' + esc(CFG.TURNAROUND) + '</li>' +
      '</ul></div>' +
      '<div class="actions">' +
        '<a href="' + orderUrl + '" class="btn btn-primary">Track your order</a>' +
        '<a href="' + esc(CFG.TELEGRAM_BOT) + '" class="btn btn-ghost" target="_blank" rel="noopener">' + ICON.tg + ' Chat with Donut</a>' +
      '</div>' + helpLinks();
  }

  function renderBalancePaid(o) {
    var paid = Math.max(0, o.finalLaundryCost - o.additionalCostPaid);
    root.innerHTML =
      '<div class="success-icon">' + ICON.tick + '</div>' +
      '<h1 class="page-headline">All <em>paid up.</em></h1>' +
      '<p class="page-lede">' + (o.name ? 'Thanks ' + esc(o.name) + '. ' : '') + 'Balance settled. We are washing your laundry now.</p>' +
      '<div class="order-id-box"><div class="order-id-label">Order ID</div><div class="order-id-value">' + esc(o.orderId) + '</div></div>' +
      '<div class="card">' +
        kv('Balance paid', fmtNaira(paid), 'hl') +
        kv('Final laundry cost', fmtNaira(o.finalLaundryCost)) +
        kv('Delivery', 'Within ' + esc(CFG.TURNAROUND)) +
        (ref ? kv('Payment ref', '<span style="font-family:var(--font-mono);font-size:12px;">' + esc(ref) + '</span>') : '') +
      '</div>' +
      '<div class="card" style="text-align:center;"><div class="card-title" style="margin-bottom:8px;">Delivery PIN</div>' +
        '<div style="font-size:34px;font-weight:600;color:var(--brand-primary);letter-spacing:.1em;">' + esc(o.deliveryPin) + '</div>' +
        '<p style="font-size:13px;color:var(--brand-muted);margin:10px 0 0;">Share it only when the rider is at your door.</p></div>' +
      '<div class="actions"><a href="' + orderUrl + '" class="btn btn-primary">Track your order</a>' +
        '<a href="' + (P.HOME || '/') + '" class="btn btn-ghost">Back to home</a></div>' + helpLinks();
  }

  /* ---------- Not-yet-paid views ---------- */
  function renderUnpaid(o, reason) {
    var amount = mode === 'balance' ? Math.max(0, o.finalLaundryCost - o.additionalCostPaid) : o.bookingTotal;
    var title = reason === 'failed' ? 'Payment <em>didn\'t go through.</em>' : 'Payment <em>not received yet.</em>';
    root.innerHTML =
      '<h1 class="page-headline" style="margin-top:8px;">' + title + '</h1>' +
      '<p class="page-lede">Your booking ' + esc(o.orderId) + ' is saved. Complete payment to ' + (mode === 'balance' ? 'release your laundry for delivery.' : 'lock in your pickup.') + '</p>' +
      '<div class="pay-panel"><h3>Amount due</h3><div class="pay-amount">' + fmtNaira(amount) + '</div>' +
        '<button class="btn btn-primary btn-block" id="ty-pay"><span class="btn-label">Pay ' + fmtNaira(amount) + ' now</span></button>' +
        '<div class="pay-secure">Secure payment by Paystack</div></div>' +
      '<div class="form-error hidden" id="ty-err"></div>' +
      '<div class="actions" style="margin-top:16px;"><a href="' + orderUrl + '" class="btn btn-ghost">View order</a></div>' + helpLinks();

    document.getElementById('ty-pay').addEventListener('click', function () {
      var btn = this, err = document.getElementById('ty-err');
      btn.disabled = true;
      Pressd.api('resumePayment', { orderId: o.orderId, type: mode === 'balance' ? 'balance' : 'booking' }).then(function (r) {
        if (r && r.alreadyPaid) { location.reload(); return; }
        if (!r || !r.ok) throw new Error((r && r.error) || 'Could not open payment');
        Pressd.pay({
          accessCode: r.accessCode, authorizationUrl: r.paymentLink,
          onSuccess: function (newRef) {
            location.href = location.pathname + '?order=' + encodeURIComponent(o.orderId) + '&reference=' + encodeURIComponent(newRef || '');
          },
          onCancel: function () { btn.disabled = false; },
        });
      }).catch(function (e) {
        btn.disabled = false;
        err.textContent = e.message + '. Please try again or WhatsApp us.';
        err.classList.remove('hidden');
      });
    });
  }

  /* ---------- Flow ---------- */
  var attempts = 0;
  function confirm() {
    stateBlock('spin', 'Confirming your payment', 'This takes a few seconds. Please keep this page open.');
    var action = mode === 'balance' ? 'confirmSecondPayment' : 'confirmPayment';
    Pressd.api(action, { orderId: orderId, reference: ref }).then(function (r) {
      handle(r);
    }).catch(function () {
      // Network hiccup: fall back to reading the order
      Pressd.get('getOrder', { orderId: orderId }).then(function (r) { handle({ ok: false, status: 'pending', order: r && r.order }); })
        .catch(function () { stateBlock('warn', 'We could not reach our server', 'Your payment is safe. Refresh this page in a moment, or check your email for the receipt.', '<button class="btn btn-primary" onclick="location.reload()">Refresh</button>'); });
    });
  }

  function isPaid(o) {
    return mode === 'balance' ? o.secondPaymentStatus === 'paid' : o.bookingPaymentStatus === 'paid';
  }

  function handle(r) {
    var o = r && r.order;
    if (r && r.error && /not found/i.test(r.error)) {
      stateBlock('warn', 'Order not found', 'We could not find order ' + esc(orderId) + '. Check the link in your email.', '<a class="btn btn-primary" href="' + (P.HOME || '/') + '">Back to home</a>');
      return;
    }
    if (o && (r.ok || isPaid(o))) {
      fireConversion(o);
      mode === 'balance' ? renderBalancePaid(o) : renderPaid(o);
      return;
    }
    if (r && r.status === 'pending' && ref && attempts < 3) {
      attempts++;
      stateBlock('spin', 'Confirming your payment', 'Paystack is still processing. Checking again…');
      setTimeout(confirm, 4000);
      return;
    }
    if (r && r.status === 'mismatch') {
      stateBlock('warn', 'We need to check this payment', 'Something about this payment did not match your order. Our team has the details. Please WhatsApp us with order ' + esc(orderId) + '.',
        '<a class="btn btn-primary" href="' + esc(CFG.WHATSAPP_URL) + '" target="_blank" rel="noopener">WhatsApp us</a>');
      return;
    }
    if (o) { renderUnpaid(o, r && r.status); return; }
    stateBlock('warn', 'Still confirming', 'If you paid, your receipt will reach your inbox shortly. You can also refresh this page.', '<button class="btn btn-primary" onclick="location.reload()">Refresh</button>');
  }

  if (!orderId) {
    stateBlock('info', 'No payment found', 'This page confirms Pressd payments. If you got here by mistake, head home to book a pickup.',
      '<a class="btn btn-primary" href="' + (P.HOME || '/') + '#book">Request a pickup</a>');
    return;
  }
  if (ref) confirm();
  else Pressd.get('getOrder', { orderId: orderId }).then(function (r) { handle({ ok: false, status: 'none', order: r && r.order, error: r && r.error }); })
    .catch(function () { stateBlock('warn', 'We could not reach our server', 'Please refresh in a moment.', '<button class="btn btn-primary" onclick="location.reload()">Refresh</button>'); });
})();
