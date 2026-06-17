/**
 * gtm-product-push.js
 *
 * Pushes product data to GTM's dataLayer on product detail pages.
 *
 * Strategy: uses window.load (fires after ALL $(document).ready callbacks,
 * including quickview-multivariants.js init()) to read prices from the DOM
 * that quickview-multivariants.js has already set. Zero changes to that file.
 *
 * Also listens for dgc:variantSelected (already dispatched by quickview-
 * multivariants.js on variant selection) to push a variant_selected event.
 */

(function () {
  'use strict';

  var PATH = window.location.pathname;

  function isProductPage() {
    return /\/(product)\//.test(PATH) || PATH.includes('/products-wholesale/');
  }

  if (!isProductPage()) return;

  // ── Initial page-view push ────────────────────────────────────────────────
  // window.load guarantees $(document).ready() has fully run, so
  // quickview-multivariants.js has already set all price/inventory values.

  window.addEventListener('load', function () {
    try {
      var hasVariants = document.querySelectorAll('.foxy_variant_item').length > 0;

      var price, oldPrice;

      if (hasVariants) {
        // Variant product: read the low-to-high price range shown at page load.
        var lowEl  = document.querySelector('.product-price_low-to-high-wrapper')
                       ?.firstChild?.nextSibling;
        var highEl = document.querySelector('.product-price_low-to-high-wrapper')
                       ?.lastChild;
        price    = lowEl  ? parseFloat(lowEl.textContent)  : undefined;
        oldPrice = highEl ? parseFloat(highEl.textContent) : undefined;
        if (price === oldPrice) oldPrice = undefined; // single-price variant set
      } else {
        // Non-variant product: quickview-multivariants sets input[name=price]
        // to the effective (sale) price and the before-sale wrapper to the original.
        var priceInput = document.querySelector('input[name=price]');
        price = priceInput ? parseFloat(priceInput.value) : undefined;

        var beforeSaleWrapper = document.querySelector('.product-price_before-sale-wrapper');
        if (beforeSaleWrapper && beforeSaleWrapper.style.display !== 'none') {
          var beforeSaleEl = beforeSaleWrapper.lastChild;
          oldPrice = beforeSaleEl ? parseFloat(beforeSaleEl.textContent) : undefined;
        }
      }

      // Foxy hidden inputs carry name, code, weight — reliable source of truth.
      var nameInput = document.querySelector('input[name=name]');
      var codeInput = document.querySelector('input[name=code]');
      var imageEl   = document.querySelector('#foxy-image');
      var invEl     = document.querySelector('#foxy-inventory');

      var invText = invEl ? invEl.textContent.trim() : '';
      var status  = 'outOfStock';
      if (/backorder/i.test(invText))           status = 'backorder';
      else if (parseFloat(invText) > 0)         status = 'inStock';

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'product_detail_view',
        product: {
          id:          codeInput ? codeInput.value : '',
          title:       nameInput ? nameInput.value : '',
          currency:    'USD',
          price:       price,
          oldPrice:    oldPrice,
          imageUrl:    imageEl  ? imageEl.src  : '',
          url:         window.location.href,
          status:      status,
          hasVariants: hasVariants
        }
      });

    } catch (err) {
      console.warn('[gtm-product-push] product_detail_view push failed:', err);
    }
  });

  // ── Variant-selected push ─────────────────────────────────────────────────
  // dgc:variantSelected is already dispatched by quickview-multivariants.js
  // when the user completes a variant selection. We just listen — no changes
  // to that file needed.

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
