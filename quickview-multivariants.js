const URL_PATH = window.location.pathname;
function isAllowedURLQuickViews() {
  return (
    URL_PATH.includes("/product-parent-categories/") ||
    URL_PATH.includes("/product-categories/") ||
    URL_PATH.includes("/brands/") ||
    URL_PATH.includes("/shop-all-products") ||
    URL_PATH.includes("/brand/")
  );
}
function isProductCMSPage() {
  return /\/(product)\/.*/.test(URL_PATH);
}
if (isProductCMSPage() || isAllowedURLQuickViews()) {
  (function () {
    // Constants and variables
    const STRAIN_DIV_ID = "#variants-strain";
    const SIZE_DIV_ID = "#variants-size";
    const FLAVOR_DIV_ID = "#variants-flavor";
    const STRENGTH_DIV_ID = "#variants-strength";
    const TYPE_DIV_ID = "#variants-type";
    const URL_PATH = window.location.pathname;
    const RADIO_DISABLED = "radio-disabled";

    let variantGroups = [];
    let variantItems = [];
    let productItemObject = {};
    let selectedProductVariantInfo;
    let element = document;

    let priceLowElement = document.querySelector(".product-price_low-to-high-wrapper").firstChild
      .nextSibling;
    let priceHighElement = document.querySelector(".product-price_low-to-high-wrapper").lastChild;
    let beforeSalePriceElement = document.querySelector(
      ".product-price_before-sale-wrapper"
    ).lastChild;
    let activePriceElement = document.querySelector(".product-price_active-wrapper").lastChild;
    let inventoryElement = document.querySelector("#foxy-inventory");
    let priceAddToCart = document.querySelector("input[name=price]");

    document.head.insertAdjacentHTML(
      "beforeend",
      "<style>.radio-group .w-radio.radio-disabled{border: 1px dashed #ccc !important;background-color: white !important;border-radius: 5px !important;} .show-quickview{display: flex !important; opacity: 1!important; transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg) !important;    transform-style: preserve-3d!important;} </style>"
    );

    // Init product detail page
    if (isProductCMSPage()) {
      $(document).ready(() => {
        init();
      });
    }
    // Init for quickviews
    if (isAllowedURLQuickViews()) {
      $(document).ready(() => {
        handleQuickViewSetUp();
        setPricesForProductListings();

        handleCmsFilterEvent();

        const quickViewIcons = document.querySelectorAll(".foxy_product_modal-icon-open");
        quickViewIcons.forEach(icon =>
          icon.addEventListener("click", e => {
            init(e);
          })
        );
      });
    }

    function handleQuickViewSetUp() {
      const allGridItems = document.querySelectorAll(".foxy_product_collection-item");

      allGridItems.forEach((item, index) => {
        const itemName = item
          .querySelector(".foxy_product_item_info .foxy_product_item_name")
          .innerText.split(" ")[0];
        item.setAttribute("id", `${itemName}-${index}`);
      });
    }

    function setPricesForProductListings() {
      const allGridItems = document.querySelectorAll(".foxy_product_collection-item");

      allGridItems.forEach(item => {
        priceLowElement = item.querySelector(".product-grid-price_low-to-high-wrapper").firstChild
          .nextSibling;
        priceHighElement = item.querySelector(".product-grid-price_low-to-high-wrapper").lastChild;
        beforeSalePriceElement = item.querySelector(
          ".product-grid-price_before-sale-wrapper"
        ).lastChild;
        activePriceElement = item.querySelector(".product-grid-price_active-wrapper").lastChild;

        buildProductItemList(item.id);
        buildVariantItemsList(item.id);
        addPrice();
      });
    }
    function updateCategoryCodeValue(renderedItems) {
      const pattern = /(?!and\b)\b\w+/g;
      renderedItems.forEach(item => {
        const categoryInput = item.element.querySelector("input[name=category]");
        if (categoryInput.value) {
          const substrings = categoryInput.value.toLowerCase().match(pattern);
          const categoryCode = substrings.join("-");
          categoryInput.value = categoryCode;
        }
      });
    }

    function handleCmsFilterEvent() {
      window.fsAttributes = window.fsAttributes || [];

      const handleRenderedItems = renderedItems => {
        if (!renderedItems.length) return;
        handleQuickViewSetUp();
        setPricesForProductListings();
        updateCategoryCodeValue(renderedItems);
        const quickViewIcons = document.querySelectorAll(".foxy_product_modal-icon-open");
        quickViewIcons.forEach(icon =>
          icon.addEventListener("click", e => {
            init(e);
          })
        );
      };

      window.fsAttributes.push(
        [
          "cmsfilter",
          filterInstances => {
            // The callback passes a `filterInstances` array with all the `CMSFilters` instances on the page.
            const [filterInstance] = filterInstances;

            // The `renderitems` event runs whenever the list renders items after filtering.
            filterInstance.listInstance.on("renderitems", renderedItems => {
              handleRenderedItems(renderedItems);
            });
          },
        ],
        [
          "cmsload",
          listInstances => {
            // The callback passes a `listInstances` array with all the `CMSList` instances on the page.
            const [listInstance] = listInstances;

            // The `renderitems` event runs whenever the list renders items after switching pages.
            listInstance.on("renderitems", renderedItems => {
              handleRenderedItems(renderedItems);
            });
          },
        ]
      );
    }

    function init(e) {
      // quickview Ways
      if (isAllowedURLQuickViews()) {
        element = e.target.parentElement;
        variantGroups = [];

        priceLowElement = element.querySelector(".product-price_low-to-high-wrapper").firstChild
          .nextSibling;
        priceHighElement = element.querySelector(".product-price_low-to-high-wrapper").lastChild;
        beforeSalePriceElement = element.querySelector(
          ".product-price_before-sale-wrapper"
        ).lastChild;
        activePriceElement = element.querySelector(".product-price_active-wrapper").lastChild;
        inventoryElement = element.querySelector("#foxy-inventory");
        priceAddToCart = element.querySelector("input[name=price]");
      }
      // Create Product and VariantItemsList
      buildProductItemList(element.id);
      buildVariantItemsList(element.id);

      // Set quantity input defaults
      const quantityInput = element.querySelector('input[name="quantity"]');
      quantityInput.value = 1;
      quantityInput.setAttribute("min", "1");

      // Remove srcset from primary image element
      element.querySelector("#foxy-image").setAttribute("srcset", "");

      // Build variant/radio options
      buildVariants(element.id);

      //Add Price according to product
      addPrice();

      // Set Inventory according to product
      setInventory();

      // Handle selected variants
      element.querySelector("#foxy-form").addEventListener("change", handleVariantSelection);
      handleOnPageLoadVariantSelection();
      addImageChangeFunctionality();
    }

    function addImageChangeFunctionality() {
      if (element !== document) return;

      const galleryImages = element.querySelectorAll(
        ".product_images-wrapper .multi_lightbox-link"
      );

      const updateMainImageHandler = evt => {
        const imageClicked = evt.target.src;

        document.querySelector("#foxy-image").src = imageClicked;
      };

      galleryImages.forEach(image => {
        image.addEventListener("click", updateMainImageHandler);
      });
    }

    function handleOnPageLoadVariantSelection() {
      if (element !== document) return;
      const params = new URLSearchParams(window.location.search);

      for (const [key, value] of params) {
        const variantToSelect = document.querySelector(`#variants-${key} input[value="${value}"]`);

        if (variantToSelect) {
          variantToSelect.click();
        }
      }
    }

    function buildVariantItemsList(elementID) {
      variantItems = [];
      let variants_item = ".foxy_variant_item";
      if (isAllowedURLQuickViews()) variants_item = `#${elementID} .foxy_variant_item`;
      $(variants_item).each(function () {
        const price = $(this).find(".foxy_variants_item-price").text();
        const salePrice = $(this).find(".foxy_variants_item-sale-price").text();
        const weight = $(this).find(".foxy_variants_item-weight").text();
        const inventory = $(this).find(".foxy_variants_item-inventory").text()
          ? $(this).find(".foxy_variants_item-inventory").text()
          : "0";
        const image = $(this).find(".foxy_variants_item-image").attr("src");
        const code = $(this).find(".foxy_variants_item-sku").text();
        const strain = $(this).find(".foxy_variants_item-strain").text();
        const size = $(this).find(".foxy_variants_item-size").text();
        const flavor = $(this).find(".foxy_variants_item-flavor").text();
        const strength = $(this).find(".foxy_variants_item-strength").text();
        const type = $(this).find(".foxy_variants_item-type").text();
        const allowBackorders = $(this).find(".foxy_variants_item-allow-backorders").text();
        const restrictedShipping = $(this).find(".foxy_variants_item-restricted-shipping").text();
        const itemCertification = $(this).find(".foxy_variants_item-certification-link").text();

        variantItems.push(
          filterEmpty({
            strain,
            size,
            flavor,
            strength,
            type,
            code,
            image,
            inventory,
            weight,
            salePrice,
            price,
            allowBackorders,
            restrictedShipping,
            itemCertification,
          })
        );
      });
    }

    function buildProductItemList(elementID) {
      productItemObject = {};
      let item_info = ".foxy_product_item_info";
      if (isAllowedURLQuickViews()) item_info = `#${elementID} .foxy_product_item_info`;
      $(item_info).each(function () {
        let name = $(this).find(".foxy_product_item_name").text();
        let price = $(this).find(".foxy_product_item_price").text();
        let salePrice = $(this).find(".foxy_product_item_sale-price").text();
        let weight = $(this).find(".foxy_product_item_weight").text();
        let inventory = $(this).find(".foxy_product_item_inventory").text()
          ? $(this).find(".foxy_product_item_inventory").text()
          : "0";
        let sku = $(this).find(".foxy_product_item_sku").text();
        let allowBackorders = $(this).find(".foxy_product_item_allow-backorders").text();
        const restrictedShipping = $(this).find(".foxy_variants_item-restricted-shipping").text();
        const itemCertification = $(this).find(".foxy_variants_item-certification-link").text()
          ? $(this).find(".foxy_variants_item-certification-link").text()
          : "none";

        productItemObject = filterEmpty({
          name: name,
          sku: sku,
          inventory: inventory,
          weight: weight,
          salePrice: salePrice,
          price: price,
          allowBackorders: allowBackorders,
          restrictedShipping,
          itemCertification,
        });
      });
    }

    function addPrice() {
      //--- Product doesn't have variants---
      if (!variantItems.length) {
        // Product has salesPrice or not
        if (productItemObject.salePrice) {
          beforeSalePriceElement.textContent = hasMembership()
            ? productItemObject.salePrice
            : productItemObject.price;
          activePriceElement.textContent = getMembershipSpecialPrice(productItemObject.salePrice);
          priceAddToCart.value = productItemObject.salePrice;

          beforeSalePriceElement.parentElement.style.display = "inline-block";
          activePriceElement.parentElement.style.display = "inline-block";
        } else {
          activePriceElement.textContent = getMembershipSpecialPrice(productItemObject.price);
          activePriceElement.classList.remove("w-dyn-bind-empty");
          activePriceElement.parentElement.style.display = "inline-block";
          beforeSalePriceElement.parentElement.style.display = hasMembership()
            ? "inline-block"
            : "none";
          beforeSalePriceElement.textContent = productItemObject.price;
          priceAddToCart.value = productItemObject.price;
        }
      }

      //--- Product has variants---
      if (variantItems.length > 0) {
        // Variants that affect price
        let allProductVariantsHaveSalePrices = [];
        const sortedPrices = variantItems
          .map(variant => {
            if (Number(variant.salePrice)) {
              allProductVariantsHaveSalePrices.push({
                salePrice: variant.salePrice,
                hasSalePrice: true,
                price: variant.price,
              });
              return Number(variant.salePrice);
            } else {
              allProductVariantsHaveSalePrices.push({
                salePrice: variant.salePrice,
                hasSalePrice: false,
                price: variant.price,
              });
              return Number(variant.price);
            }
          })
          .sort((a, b) => a - b);

        if (sortedPrices[0] !== sortedPrices[sortedPrices.length - 1]) {
          priceLowElement.textContent = getMembershipSpecialPrice(sortedPrices[0]);
          priceHighElement.textContent = getMembershipSpecialPrice(
            sortedPrices[sortedPrices.length - 1]
          );
          priceLowElement.parentElement.style.display = "block";
          beforeSalePriceElement.parentElement.style.display = "none";
          activePriceElement.parentElement.style.display = "none";
        } else {
          // Variants that don't affect price with salePrice and without
          if (
            allProductVariantsHaveSalePrices.every(
              productCheck => productCheck.hasSalePrice === true
            )
          ) {
            beforeSalePriceElement.textContent = hasMembership()
              ? allProductVariantsHaveSalePrices[0].salePrice
              : allProductVariantsHaveSalePrices[0].price;
            activePriceElement.textContent = getMembershipSpecialPrice(
              allProductVariantsHaveSalePrices[0].salePrice
            );
            priceAddToCart.value = allProductVariantsHaveSalePrices[0].salePrice;
            beforeSalePriceElement.classList.remove("w-dyn-bind-empty");
            activePriceElement.classList.remove("w-dyn-bind-empty");
            beforeSalePriceElement.parentElement.style.display = "inline-block";
            activePriceElement.parentElement.style.display = "inline-block";
            return;
          }
          activePriceElement.textContent = getMembershipSpecialPrice(sortedPrices[0]);
          priceAddToCart.value = sortedPrices[0];
          activePriceElement.classList.remove("w-dyn-bind-empty");
          beforeSalePriceElement.classList.remove("w-dyn-bind-empty");
          activePriceElement.parentElement.style.display = "inline-block";
          beforeSalePriceElement.parentElement.style.display = hasMembership()
            ? "inline-block"
            : "none";
          beforeSalePriceElement.textContent = sortedPrices[0];
        }
      }
    }

    function setInventory() {
      if (variantItems.length > 0) {
        inventoryElement.textContent = "Please choose options.";
        inventoryElement.classList.remove("w-dyn-bind-empty");
        inventoryElement.nextElementSibling.style.display = "none";
        return;
      }

      if (!variantItems.length) {
        const { inventory, allowBackorders } = productItemObject;
        const quantity = element.querySelector("input[name=quantity]").value;
        const submitButton = element.querySelector("#foxy-form input[type=submit]");
        if (Number(inventory) > 0) {
          inventoryElement.textContent = inventory;
          inventoryElement.nextSibling.style.display = "inline";
          return;
        }

        if (Number(inventory) === 0 && allowBackorders === "false") {
          inventoryElement.textContent = "Out of stock.";
          inventoryElement.nextElementSibling.style.display = "none";
          submitButton.disabled = true;
          submitButton.style.backgroundColor = "#37b7728c";
          return;
        }

        if (
          (Number(quantity) > Number(inventory) && allowBackorders === "true") ||
          (Number(inventory) === 0 && allowBackorders === "true")
        ) {
          inventoryElement.textContent = "Item Available for Backorder.";
          inventoryElement.classList.remove("margin-top-1-5");
          inventoryElement.nextElementSibling.style.display = "none";
          element
            .querySelector("#foxy-form .w-embed")
            .insertAdjacentHTML(
              "beforeend",
              `<input type="hidden" name="Delayed_shipping" value="Item Available for Backorder.">`
            );
          return;
        }
      }
    }

    function buildVariants(elementID) {
      let variants_item = ".foxy_variant_item";
      if (isAllowedURLQuickViews()) variants_item = `#${elementID} .foxy_variant_item`;
      $(variants_item).each(function (index) {
        let strain = $(this).find(".foxy_variants_item-strain").text();
        let size = $(this).find(".foxy_variants_item-size").text();
        let flavor = $(this).find(".foxy_variants_item-flavor").text();
        let strength = $(this).find(".foxy_variants_item-strength").text();
        let type = $(this).find(".foxy_variants_item-type").text();

        addVariantGroup(strain, STRAIN_DIV_ID, index);
        addVariantGroup(size, SIZE_DIV_ID, index);
        addVariantGroup(flavor, FLAVOR_DIV_ID, index);
        addVariantGroup(strength, STRENGTH_DIV_ID, index);
        addVariantGroup(type, TYPE_DIV_ID, index);
      });
    }

    function addVariantGroup(variantInfo, VariantContainer, index) {
      const variantGroupName = capitalizeFirstLetter(VariantContainer.split("-")[1]);
      if (variantGroupName) variantGroups.push(variantGroupName);
      let variant_container = VariantContainer;
      if (isAllowedURLQuickViews()) variant_container = `#${element.id} ${VariantContainer}`;

      if (variantInfo != "") {
        // Show variant container
        element.querySelector(VariantContainer).parentElement.style.display = "block";
        let variantListed = 0;

        $(variant_container).append(
          `<label class="radio-button-field w-radio">
        <div class="w-form-formradioinput w-form-formradioinput--inputType-custom radio-button w-radio-input"></div>
        <input type="radio" name="${variantGroupName}" id="${variantInfo}-${index}" class="${variantInfo
            .split(/\s+/)
            .join("")
            .toLowerCase()}" value="${variantInfo}" style="opacity:0;position:absolute;z-index:-1" required>
        <span class="radio-btn w-form-label" for="${variantInfo}-${index}">${variantInfo}</span>
      </label>`
        );
        $(`${variant_container} .w-radio`).each(function () {
          let label = $(this).find(".w-form-label").text();
          if (variantInfo == label && variantListed == 0) {
            variantListed = 1;
          } else if (variantInfo == label && variantListed == 1) {
            $(this).remove();
          }
        });
      } else {
        $(variant_container).parent().remove();
      }
    }

    function handleVariantSelection(e) {
      let variants_item = ".foxy_variant_item";
      if (isAllowedURLQuickViews()) variants_item = `#${element.id} .foxy_variant_item`;
      const variantSelection = e.target.value;
      const variantSelectionGroup = e.target.name;
      if (!variantSelectionGroup) return;

      // Handle quantity change to update availability when variant is chossen.
      if (variantSelectionGroup === "quantity" && isVariantsSelectionComplete())
        return handleQuantityChange();

      // remove RADIO_DISABLED class on current target
      e.target.parentElement.classList.remove(RADIO_DISABLED);
      element
        .querySelector(`#variants-${variantSelectionGroup.toLowerCase()}`)
        .classList.add("option-selected");

      // Possible product and variant combinations and their product info
      let availableProductsPerVariant = [];

      $(variants_item).each(function () {
        let price = $(this).find(".foxy_variants_item-price").text();
        let salePrice = $(this).find(".foxy_variants_item-sale-price").text();
        let weight = $(this).find(".foxy_variants_item-weight").text();
        let inventory = $(this).find(".foxy_variants_item-inventory").text()
          ? $(this).find(".foxy_variants_item-inventory").text()
          : "0";
        let image = $(this).find(".foxy_variants_item-image").attr("src");
        let code = $(this).find(".foxy_variants_item-sku").text();
        let strain = $(this).find(".foxy_variants_item-strain").text();
        let size = $(this).find(".foxy_variants_item-size").text();
        let flavor = $(this).find(".foxy_variants_item-flavor").text();
        let strength = $(this).find(".foxy_variants_item-strength").text();
        let type = $(this).find(".foxy_variants_item-type").text();
        let allowBackorders = $(this).find(".foxy_variants_item-allow-backorders").text();
        const restrictedShipping = $(this).find(".foxy_variants_item-restricted-shipping").text();
        const itemCertification = $(this).find(".foxy_variants_item-certification-link").text()
          ? $(this).find(".foxy_variants_item-certification-link").text()
          : "none";

        let currentProduct = [
          strain,
          size,
          flavor,
          strength,
          type,
          code,
          image,
          inventory,
          weight,
          salePrice,
          price,
          allowBackorders,
          restrictedShipping,
          itemCertification,
        ];

        if (currentProduct.includes(variantSelection)) {
          availableProductsPerVariant.push(
            filterEmpty({
              strain: strain,
              size: size,
              flavor: flavor,
              strength: strength,
              type: type,
              code: code,
              image: image,
              inventory: inventory,
              weight: weight,
              salePrice: salePrice,
              price: price,
              allowBackorders: allowBackorders,
              restrictedShipping: restrictedShipping,
              itemCertification: itemCertification,
            })
          );
        }
      });
      updateVariantOptions(availableProductsPerVariant, variantSelectionGroup);
      updateProductInfo(availableProductsPerVariant);
    }

    function handleQuantityChange() {
      const { inventory, allowBackorders } = !variantItems.length
        ? productItemObject
        : selectedProductVariantInfo;
      const quantity = element.querySelector("input[name=quantity]").value;
      const submitButton = element.querySelector("#foxy-form input[type=submit]");

      if (
        (Number(inventory) === 0 && allowBackorders === "false") ||
        (Number(quantity) > Number(inventory) && allowBackorders === "false")
      ) {
        inventoryElement.textContent = "Out of stock.";
        inventoryElement.nextElementSibling.style.display = "none";
        if (element.querySelector("input[name=Delayed_shipping]"))
          element.querySelector("input[name=Delayed_shipping]").remove();
        submitButton.disabled = true;
        submitButton.style.backgroundColor = "#37b7728c";
        return;
      }

      if (
        (Number(quantity) > Number(inventory) && allowBackorders === "true") ||
        (Number(inventory) === 0 && allowBackorders === "true")
      ) {
        inventoryElement.textContent = "Item Available for Backorder.";
        inventoryElement.classList.remove("margin-top-1-5");
        inventoryElement.nextElementSibling.style.display = "none";
        element.querySelector(`input[name="quantity_max"]`).value = "";
        element
          .querySelector("#foxy-form .w-embed")
          .insertAdjacentHTML(
            "beforeend",
            `<input type="hidden" name="Delayed_shipping" value="Item Available for Backorder.">`
          );
        submitButton.disabled = false;
        submitButton.style.backgroundColor = "#37b772";
        return;
      }
      if (Number(quantity) <= Number(inventory)) {
        inventoryElement.textContent = inventory;
        inventoryElement.nextSibling.style.display = "inline";
        if (element.querySelector("input[name=Delayed_shipping]"))
          element.querySelector("input[name=Delayed_shipping]").remove();
        submitButton.disabled = false;
        submitButton.style.backgroundColor = "#37b772";
        return;
      }
    }

    function updateVariantOptions(availableProductsPerVariant, variantSelectionGroup) {
      const otherVariantGroups = variantGroups.filter(
        variantGroup => variantGroup !== variantSelectionGroup
      );

      otherVariantGroups.forEach(otherGroup => {
        // Check if other groups have selections
        const otherGroupParent = element.querySelector(`#variants-${otherGroup.toLowerCase()}`);
        let hasSelection = null;
        if (otherGroupParent) {
          hasSelection = element
            .querySelector(`#variants-${otherGroup.toLowerCase()}`)
            .classList.contains("option-selected");
        }

        //Get all values from other groups / remove all dashes
        const otherGroupInputsValues = [];
        element.querySelectorAll(`input[name=${otherGroup}]`).forEach(input => {
          otherGroupInputsValues.push(input.value);
          input.parentElement.classList.remove(RADIO_DISABLED);
        });

        const availableProductNames = availableProductsPerVariant.map(
          e => e[otherGroup.toLowerCase()]
        );

        const unavailableOptions = otherGroupInputsValues.filter(
          value => availableProductNames.indexOf(value) == -1
        );

        unavailableOptions.forEach(option => {
          element
            .querySelector(`input[value="${option}"]`)
            .parentElement.classList.add(RADIO_DISABLED);
        });

        if (hasSelection && unavailableOptions.length !== 0) {
          unavailableOptions.forEach(option => {
            const unavailableElement = element.querySelector(`input[value="${option}"]:checked`);
            if (unavailableElement) {
              unavailableElement.checked = false;
              unavailableElement.parentElement.classList.add(RADIO_DISABLED);
              unavailableElement.previousElementSibling.classList.remove("w--redirected-checked");
              unavailableElement.parentElement.parentElement.classList.remove("option-selected");
            }
          });
        }
      });
    }

    function updateProductInfo(availableProductsPerVariant) {
      if (isVariantsSelectionComplete()) {
        // Hide Range Price
        priceLowElement.parentElement.style.display = "none";

        // Save the selected product variant
        let selectedProductVariant = {};
        element.querySelectorAll("input:checked").forEach(variant => {
          selectedProductVariant[variant.name] = variant.value;
        });

        // Find Selected Product Variant Total Information
        selectedProductVariantInfo = availableProductsPerVariant.find(product => {
          let isProduct = [];
          Object.keys(selectedProductVariant).forEach(key => {
            product[key.toLowerCase()] === selectedProductVariant[key]
              ? isProduct.push(true)
              : isProduct.push(false);
          });
          return isProduct.every(productCheck => productCheck === true);
        });

        // Update Hidden Add to Cart Inputs with Variant Data and
        //DOM customer facing elements with product info
        Object.keys(selectedProductVariantInfo).forEach(key => {
          const inputToUpdate = element.querySelector(`input[name="${key}"]`);
          if (inputToUpdate) inputToUpdate.value = selectedProductVariantInfo[key];

          switch (key) {
            case "inventory":
              // Update max quantity
              element.querySelector(`input[name="quantity_max"]`).value =
                selectedProductVariantInfo["inventory"];

              handleQuantityChange();
              break;
            case "price":
              if (selectedProductVariantInfo["salePrice"]) {
                priceAddToCart.value = selectedProductVariantInfo["salePrice"];

                activePriceElement.textContent = getMembershipSpecialPrice(
                  selectedProductVariantInfo["salePrice"]
                );
                beforeSalePriceElement.textContent = hasMembership()
                  ? selectedProductVariantInfo["salePrice"]
                  : selectedProductVariantInfo[key];

                activePriceElement.classList.remove("w-dyn-bind-empty");
                beforeSalePriceElement.classList.remove("w-dyn-bind-empty");
                activePriceElement.parentElement.style.display = "inline-block";
                beforeSalePriceElement.parentElement.style.display = "inline-block";
                break;
              }
              beforeSalePriceElement.parentElement.style.display = hasMembership()
                ? "inline-block"
                : "none";
              activePriceElement.textContent = getMembershipSpecialPrice(
                selectedProductVariantInfo[key]
              );
              activePriceElement.parentElement.style.display = "inline-block";
              activePriceElement.classList.remove("w-dyn-bind-empty");
              break;
            case "image":
              element.querySelector("#foxy-image").src = selectedProductVariantInfo[key];
              break;
            case "restrictedShipping":
              element.querySelector("input[name=Restricted_Shipping]").value =
                selectedProductVariantInfo[key];
              break;
            case "itemCertification":
              const certification = element.querySelector(".product_quickview_certification-link");
              if (selectedProductVariantInfo[key] === "none") {
                certification.style.display = "none";
              }
              certification.href = selectedProductVariantInfo[key];
              certification.style.display = "block";
              break;
          }
        });
        return;
      }

      addPrice();
      setInventory();
      const certification = element.querySelector(".product_quickview_certification-link");
      if (productItemObject["itemCertification"] === "none") {
        certification.style.display = "none";
        return;
      }
      certification.href = productItemObject["itemCertification"];
      certification.style.display = "block";
    }
    // Utilities / helper functions --

    function hasMembership() {
      return (
        FC.custom.hasSubscriptionByCode("dragon-slayer") ||
        FC.custom.hasSubscriptionByCode("dragon-master")
      );
    }

    function filterEmpty(obj) {
      return Object.entries(obj).reduce((a, [k, v]) => (v ? ((a[k] = v), a) : a), {});
    }

    function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    }

    function isVariantsSelectionComplete() {
      if (element.querySelector("#foxy-form").querySelectorAll("[required]:invalid").length === 0) {
        return true;
      }
      return false;
    }

    function getMembershipSpecialPrice(priceToDiscountFrom) {
      // If it has subscription then return the discounted rate add discount text, else return the same rate
      const hasDragonSlayerSub = FC.custom.hasSubscriptionByCode("dragon-slayer");
      const hasDragonMasterSub = FC.custom.hasSubscriptionByCode("dragon-master");
      const percentFromAmmount = (amount, percent) => (amount * percent) / 100;
      const handlePriceDiscount = (priceToDiscountFrom, discountPercent, membershipName) => {
        const ammountToDiscount = percentFromAmmount(priceToDiscountFrom, discountPercent);
        if (!element.querySelector("#membership-discount-label-applied")) {
          element
            .querySelector(".product-price_component")
            .insertAdjacentHTML(
              "afterend",
              `<div class="margin-top-1-5" id="membership-discount-label-applied"><strong>${membershipName} membership discount applied.</strong></div>`
            );
        }
        return (priceToDiscountFrom - ammountToDiscount).toFixed(2);
      };
      if (hasDragonSlayerSub) {
        return handlePriceDiscount(priceToDiscountFrom, 5, "DragonSlayer");
      }
      if (hasDragonMasterSub) {
        return handlePriceDiscount(priceToDiscountFrom, 10, "DragonMaster");
      }
      return Number(priceToDiscountFrom).toFixed(2);
    }
  })();
}
