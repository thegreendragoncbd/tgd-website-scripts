/**
 * gtm-product-push.js
 *
 * Listens for the dgc:productPageReady event dispatched by quickview-multivariants.js
 * and pushes a product_detail_view event to GTM's dataLayer.
 *
 * Keep this script completely separate from quickview-multivariants.js so that
 * any error here cannot affect pricing, variant display, or cart functionality.
 *
 * Load order: must be placed AFTER quickview-multivariants.js in Webflow's
 * custom code footer.
 */

(function () {
  'use strict';

  document.addEventListener('dgc:productPageReady', function (e) {
    try {
      var product  = e.detail.product;   // productItemObject from quickview-multivariants
      var variants = e.detail.variants;  // variantItems array

      var price, oldPrice;

      if (variants.length > 0) {
        // Variant product: report the lowest effective price across all variants.
        // The user hasn't selected a specific variant yet.
        var effectivePrices = variants.map(function (v) {
          return Number(v.salePrice) || Number(v.price);
        });
        price = Math.min.apply(null, effectivePrices);

        var regularPrices = variants.map(function (v) { return Number(v.price); });
        oldPrice = Math.min.apply(null, regularPrices);

        if (oldPrice === price) oldPrice = undefined;
      } else {
        // Non-variant product
        price    = Number(product.salePrice || product.price);
        oldPrice = product.salePrice ? Number(product.price) : undefined;
      }

      // Derive availability status from inventory data
      var inv    = Number(product.inventory);
      var status = inv > 0
        ? 'inStock'
        : (product.allowBackorders === 'true' ? 'backorder' : 'outOfStock');

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'product_detail_view',
        product: {
          id:          product.sku   || '',
          title:       product.name  || '',
          currency:    'USD',
          price:       price,
          oldPrice:    oldPrice,
          imageUrl:    (document.querySelector('#foxy-image') || {}).src || '',
          url:         window.location.href,
          status:      status,
          hasVariants: variants.length > 0
        }
      });

    } catch (err) {
      // Never let GTM errors surface to the user or affect other scripts
      console.warn('[gtm-product-push] dataLayer push failed:', err);
    }
  });

  // Also push when a specific variant is selected by the user.
  document.addEventListener('dgc:variantSelected', function (e) {
    try {
      var v = e.detail.variant;
      if (!v || !v.price) return;

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
