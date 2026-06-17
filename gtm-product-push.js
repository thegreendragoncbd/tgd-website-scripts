/**
 * gtm-product-push.js
 *
 * Pushes product data to GTM's dataLayer on product detail pages.
 *
 * Reads prices from the DOM after quickview-multivariants.js has set them.
 * Safe to load at any time — before or after window.load — because it checks
 * document.readyState and either runs immediately or waits for the load event.
 *
 * Zero changes to quickview-multivariants.js required.
 */

(function () {
  'use strict';

  var PATH = window.location.pathname;

  function isProductPage() {
    return /\/(product)\//.test(PATH) || PATH.includes('/products-wholesale/');
  }

  if (!isProductPage()) return;

  // ── Initial page-view push ────────────────────────────────────────────────

  function pushPageView() {
    try {
      var hasVariants = document.querySelectorAll('.foxy_variant_item').length > 0;

      var price, oldPrice;

      if (hasVariants) {
        // Variant product: read the price range quickview-multivariants.js rendered.
        var wrapper = document.querySelector('.product-price_low-to-high-wrapper');
        var lowEl   = wrapper && wrapper.firstChild && wrapper.firstChild.nextSibling;
        var highEl  = wrapper && wrapper.lastChild;
        price    = lowEl  ? parseFloat(lowEl.textContent)  : undefined;
        oldPrice = highEl ? parseFloat(highEl.textContent) : undefined;
        if (price === oldPrice) oldPrice = undefined;
      } else {
        // Non-variant: quickview-multivariants.js sets input[name=price] to the
        // effective (sale) price and the before-sale wrapper to the original.
        var priceInput = document.querySelector('input[name=price]');
        price = priceInput ? parseFloat(priceInput.value) : undefined;

        var beforeSaleWrapper = document.querySelector('.product-price_before-sale-wrapper');
        if (beforeSaleWrapper && beforeSaleWrapper.style.display !== 'none') {
          var beforeSaleEl = beforeSaleWrapper.lastChild;
          oldPrice = beforeSaleEl ? parseFloat(beforeSaleEl.textContent) : undefined;
        }
      }

      var nameInput = document.querySelector('input[name=name]');
      var codeInput = document.querySelector('input[name=code]');
      var imageEl   = document.querySelector('#foxy-image');
      var invEl     = document.querySelector('#foxy-inventory');

      var invText = invEl ? invEl.textContent.trim() : '';
      var status  = 'outOfStock';
      if (/backorder/i.test(invText))   status = 'backorder';
      else if (parseFloat(invText) > 0) status = 'inStock';

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'product_detail_view',
        product: {
          id:          codeInput ? codeInput.value : '',
          title:       nameInput ? nameInput.value : '',
          currency:    'USD',
          price:       price,
          oldPrice:    oldPrice,
          imageUrl:    imageEl ? imageEl.src : '',
          url:         window.location.href,
          status:      status,
          hasVariants: hasVariants
        }
      });

    } catch (err) {
      console.warn('[gtm-product-push] product_detail_view push failed:', err);
    }
  }

  // If window.load has already fired (readyState === 'complete'), run now.
  // Otherwise wait for it. This handles loading via GTM, async tags, or
  // standard <script> tags equally.
  if (document.readyState === 'complete') {
    pushPageView();
  } else {
    window.addEventListener('load', pushPageView);
  }

  // ── Variant-selected push ─────────────────────────────────────────────────
  // dgc:variantSelected is dispatched by quickview-multivariants.js when the
  // user completes a variant selection. We listen here — no changes to that
  // file needed.

  document.addEventListener('dgc:variantSelected', function (e) {
    try {
      var v = e.detail && e.detail.variant;
      if (!v || (!v.price && !v.salePrice)) return;

      var variantPrice    = Number(v.salePrice || v.price);
      var variantOldPrice = v.salePrice ? Number(v.price) : undefined;

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event:           'variant_selected',
        variantName:     v.name || '',
        variantSku:      v.code || '',
        productPrice:    variantPrice,
        productOldPrice: variantOldPrice
      });

    } catch (err) {
      console.warn('[gtm-product-push] variant_selected push failed:', err);
    }
  });

}());
