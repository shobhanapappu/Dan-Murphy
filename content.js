let isAutoLoading = false;
let clickCount = 0;
let productLinks = new Set(); // Store unique links
let isNavigating = false;
let downloadButton = null; // Global reference to download button

// Function to collect the first product link from each <li> with classes js-list and search-results__item
function collectProductLinks() {
  const listItems = document.querySelectorAll('li.js-list.search-results__item');
  listItems.forEach(item => {
    const link = item.querySelector('a[href*="/product/"]'); // Get the first link only
    if (link && link.href.includes('danmurphys.com.au/product/')) {
      productLinks.add(`@${link.href}`);
    }
  });
  console.log(`Collected ${productLinks.size} unique product links`);
  sessionStorage.setItem('dmProductLinks', JSON.stringify(Array.from(productLinks)));
}

// Function to create or update download button
function createDownloadButton() {
  // Remove existing button if it exists
  if (downloadButton) {
    downloadButton.remove();
  }

  downloadButton = document.createElement('div');
  downloadButton.id = 'dm-download-button';
  downloadButton.style.cssText = `
    position: fixed;
    top: 80px;
    right: 10px;
    background: #2196F3;
    color: white;
    padding: 15px;
    border-radius: 8px;
    z-index: 10002;
    font-family: Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    cursor: pointer;
    transition: all 0.3s ease;
    max-width: 200px;
  `;

  downloadButton.innerHTML = `
    <div style="text-align: center;">
      <div style="font-weight: bold; margin-bottom: 5px;"> Download Progress</div>
      <div id="download-progress" style="font-size: 12px; margin-bottom: 10px;">Ready to download</div>
      <button id="download-csv-btn" style="margin: 2px; padding: 8px 12px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
        Download CSV
      </button>
      <button id="download-json-btn" style="margin: 2px; padding: 8px 12px; background: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
        Download JSON
      </button>
    </div>
  `;

  document.body.appendChild(downloadButton);

  // Add event listeners
  document.getElementById('download-csv-btn').addEventListener('click', () => {
    downloadCurrentProgress('csv');
  });

  document.getElementById('download-json-btn').addEventListener('click', () => {
    downloadCurrentProgress('json');
  });

  // Update progress display
  updateDownloadProgress();
}

// Function to update download progress display
function updateDownloadProgress() {
  if (!downloadButton) return;

  const scrapedData = JSON.parse(sessionStorage.getItem('dmScrapedData') || '[]');
  const totalLinks = JSON.parse(sessionStorage.getItem('dmProductLinks') || '[]').length;
  const progressDiv = document.getElementById('download-progress');

  if (progressDiv) {
    if (totalLinks > 0) {
      progressDiv.textContent = `${scrapedData.length} products scraped`;
    } else {
      progressDiv.textContent = 'Ready to download';
    }
  }
}

// Function to download current progress
function downloadCurrentProgress(format) {
  const scrapedData = JSON.parse(sessionStorage.getItem('dmScrapedData') || '[]');
  const totalLinks = JSON.parse(sessionStorage.getItem('dmProductLinks') || '[]').length;

  if (scrapedData.length === 0) {
    alert('No data has been scraped yet. Please wait for the scraping to begin.');
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const progress = `${scrapedData.length}_of_${totalLinks}`;

  if (format === 'csv') {
    const csvData = convertToCSV(scrapedData);
    downloadData(`dan_murphys_products_${progress}_${timestamp}.csv`, csvData, 'text/csv;charset=utf-8;');
  } else if (format === 'json') {
    const jsonData = JSON.stringify(scrapedData, null, 2);
    downloadData(`dan_murphys_products_${progress}_${timestamp}.json`, jsonData, 'application/json');
  }

  console.log(`Downloaded ${format.toUpperCase()} file with ${scrapedData.length} products`);
}

// Function to find and click the "Show 24 more" button
function clickShowMoreButton() {
  const buttons = document.querySelectorAll('button');
  let button = null;

  for (const btn of buttons) {
    const text = btn.textContent.toLowerCase().trim();
    if (text.includes('show 24 more') || text.includes('show more') || text.includes('load more')) {
      button = btn;
      break;
    }
  }

  if (button && button.offsetParent !== null) {
    button.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      button.click();
      clickCount++;
      console.log(`Clicked "Show more" button ${clickCount} times`);

      try {
        chrome.runtime.sendMessage({
          action: 'statusUpdate',
          message: `Status: Running - Clicked ${clickCount} times`,
          isRunning: true
        });
      } catch (e) {
        console.log('Could not send message to popup:', e);
      }

      setTimeout(() => {
        collectProductLinks();
        if (isAutoLoading) {
          clickShowMoreButton();
        }
      }, 2000);
    }, 500);
    return true;
  } else {
    console.log('No more "Show 24 more" buttons found. Auto loading complete.');
    stopAutoLoading();
    showConfirmation();
    return false;
  }
}

// Function to automatically start link navigation
function showConfirmation() {
  console.log(`Collected ${productLinks.size} unique product links. Starting navigation automatically.`);

  // Save the links to session storage before starting navigation
  sessionStorage.setItem('dmProductLinks', JSON.stringify(Array.from(productLinks)));
  sessionStorage.setItem('dmCurrentLinkIndex', '0');
  sessionStorage.setItem('dmScrapedData', '[]'); // Initialize scraped data
  createDownloadButton(); // Create download button immediately
  startLinkNavigation();
}

// Function to navigate through links
function startLinkNavigation() {
  if (isNavigating) return;
  isNavigating = true;

  const linksArray = JSON.parse(sessionStorage.getItem('dmProductLinks') || '[]');
  let currentIndex = parseInt(sessionStorage.getItem('dmCurrentLinkIndex') || '0');

  if (currentIndex >= linksArray.length) {
    isNavigating = false;
    const scrapedData = JSON.parse(sessionStorage.getItem('dmScrapedData') || '[]');
    console.log('Finished navigating all links. Converting data to CSV and downloading.');

    // Download both formats
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const csvData = convertToCSV(scrapedData);
    const jsonData = JSON.stringify(scrapedData, null, 2);

    downloadData(`dan_murphys_products_complete_${timestamp}.csv`, csvData, 'text/csv;charset=utf-8;');
    downloadData(`dan_murphys_products_complete_${timestamp}.json`, jsonData, 'application/json');

    sessionStorage.removeItem('dmProductLinks');
    sessionStorage.removeItem('dmCurrentLinkIndex');
    sessionStorage.removeItem('dmScrapedData');
    if (downloadButton) downloadButton.remove();

    console.log('Finished navigating all links');
    try {
      chrome.runtime.sendMessage({
        action: 'statusUpdate',
        message: 'Status: Completed! Both CSV and JSON files downloaded.',
        isRunning: false
      });
    } catch (e) {
      console.log('Could not send message to popup:', e);
    }
    return;
  }

  // Store the current index
  sessionStorage.setItem('dmCurrentLinkIndex', currentIndex + 1);

  const link = linksArray[currentIndex].replace('@', '');
  console.log(`Navigating to: ${link}`);

  // Navigate in the same tab
  window.location.href = link;
}

// Function to convert array of objects to CSV
function convertToCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }

  // Define the exact column order as specified in the requirements
  const headers = [
    'Product ID',
    'Product URL',
    'Image URL',
    'Name',
    'Brand',
    'Style',
    'ABV',
    'Description',
    'Rating',
    'Review',
    'Bundle',
    'Stock',
    'Non-Member Price',
    'Promo Price',
    'Discount Price',
    'Member Price'
  ];

  const csvRows = [headers.join(',')];

  data.forEach(item => {
    const values = headers.map(header => {
      let value = item[header] || '';

      if (typeof value === 'string') {
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        const sanitizedValue = value.replace(/"/g, '""');
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${sanitizedValue}"`;
        }
        return sanitizedValue;
      }
      if (typeof value === 'object' && value !== null) {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      return value || '';
    });
    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
}

// Function to download data as a file
function downloadData(filename, content, contentType = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: contentType });
  const link = document.createElement('a');
  if (link.href) {
    URL.revokeObjectURL(link.href);
  }
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function extractProductDetails() {
  // Extract Product ID from URL
  // const productId = window.location.href.match(/DM_(\d+)/)?.[1] || 'N/A';
  const productId = window.location.href.match(/\/product\/([^/]+)/)?.[1] || 'N/A';



  // Extract brand and product name
  let brand = 'N/A';
  let productName = 'N/A';
  let fullName = 'N/A';

  try {
    brand = document.querySelector('.product-title__brand')?.textContent.trim() || 'N/A';
    productName = document.querySelector('.product-title__name')?.textContent.trim() || 'N/A';
    // Combine brand and product name
    if (brand !== 'N/A' && productName !== 'N/A') {
      fullName = `${brand} ${productName}`;
    } else if (productName !== 'N/A') {
      fullName = productName;
    }
  } catch (e) {
    console.error('Error extracting name/brand:', e);
  }

  // Extract image URL
  let imageUrl = 'N/A';
  try {
    const mainImage = document.querySelector('.zoom__image, .product-image img, .product-hero__image img');
    if (mainImage) {
      imageUrl = mainImage.src || mainImage.getAttribute('src') || 'N/A';
    }
  } catch (e) {
    console.error('Error extracting image:', e);
  }

  // Extract style
  let style = 'N/A';
  try {
    // Try multiple selectors for style information
    const styleElement = document.querySelector('.style-profile__type, .product-attribute__item-value');
    if (styleElement) {
      style = styleElement.textContent.trim();
    }
    // Fallback: check product specifications
    const specs = document.querySelectorAll('.product-attribute__item');
    specs.forEach(spec => {
      const key = spec.querySelector('.product-attribute__item-key')?.textContent.trim().toLowerCase();
      if (key && (key.includes('style') || key.includes('type'))) {
        style = spec.querySelector('.product-attribute__item-value')?.textContent.trim() || style;
      }
    });
  } catch (e) {
    console.error('Error extracting style:', e);
  }

  // Extract ABV
  let abv = 'N/A';
  try {
    const abvElement = document.querySelector('.aprofile__item img[alt="alcohol percent"]')?.parentElement.querySelector('.aprofile__value');
    if (abvElement) {
      abv = abvElement.textContent.trim();
    }
  } catch (e) {
    console.error('Error extracting ABV:', e);
  }

  // Extract description
  let description = 'N/A';
  try {
    description = document.querySelector('.product-skeleton__details-description-reg, .product-description')?.textContent.trim() || 'N/A';
  } catch (e) {
    console.error('Error extracting description:', e);
  }

  let rating = 'N/A';
  let review = 'N/A';

  try {
    const ratingElement = document.querySelector('.rating, .star-rating, .product-rating');
    if (ratingElement) {
      const fullText = ratingElement.textContent.trim(); // e.g., "4.6(41 reviews)"
      const match = fullText.match(/^([\d.]+)\s*\((\d+)/); // captures "4.6" and "41"
      if (match) {
        rating = match[1];  // "4.6"
        review = match[2];  // "41"
      } else {
        rating = fullText; // fallback if format doesn't match
      }
    }

    const reviewElement = document.querySelector('.review-count, .reviews');
    if (reviewElement && review === 'N/A') {
      const reviewText = reviewElement.textContent.trim();
      const reviewMatch = reviewText.match(/(\d+)/); // extract number from text like "41 reviews"
      if (reviewMatch) {
        review = reviewMatch[1];
      }
    }
  } catch (e) {
    console.error('Error extracting rating/review:', e);
  }

  // Extract stock status
  let stock = 'N/A';
  try {
    const stockElement = document.querySelector('.stock-status, .availability-status, .fulfilment-options__available-pickup');
    if (stockElement) {
      stock = stockElement.textContent.trim();
    }
  } catch (e) {
    console.error('Error extracting stock:', e);
  }

  // Extract pricing information for different bundles
  const products = [];

  try {
    // Look for pack options within specific containers
    const packElements = document.querySelectorAll('.atf .pack, .method__pack-selector .pack');

    if (packElements.length > 0) {
      packElements.forEach((packElement, index) => {
        // Determine bundle type from pack__type
        let bundle = 'N/A';
        const packTypeElement = packElement.querySelector('.pack__type span');
        if (packTypeElement) {
          const packText = packTypeElement.textContent.toLowerCase();
          if (packText.includes('pack (4)')) {
            bundle = 'Pack (4)';
          } else if (packText.includes('pack (6)')) {
            bundle = 'Pack (6)';
          } else if (packText.includes('pack (12)')) {
            bundle = 'Pack (12)';
          } else if (packText.includes('case (16)')) {
            bundle = 'Case (16)';
          } else if (packText.includes('case (24)')) {
            bundle = 'Case (24)';
          }
        }

        // Extract pricing
        let nonMemberPrice = 'N/A';
        let promoPrice = 'N/A';
        let discountPrice = 'N/A';
        let memberPrice = 'N/A';

        // Non-member price from pack__price-offer or pack__price
        const nonMemberPriceElement = packElement.querySelector('.pack__price-offer span');
        if (nonMemberPriceElement) {
          nonMemberPrice = nonMemberPriceElement.textContent.trim().replace(/[^\d.]/g, '');
          if (nonMemberPrice) nonMemberPrice = '$' + nonMemberPrice;
        } else {
          const regularPriceElement = packElement.querySelector('.pack__price:not(.pack__price--member)');
          if (regularPriceElement) {
            nonMemberPrice = regularPriceElement.textContent.trim().replace(/[^\d.]/g, '');
            if (nonMemberPrice) nonMemberPrice = '$' + nonMemberPrice;
          }
        }

        // Member price
        const memberPriceElement = packElement.querySelector('.pack__price--member');
        if (memberPriceElement) {
          memberPrice = memberPriceElement.textContent.trim().replace(/[^\d.]/g, '');
          if (memberPrice) memberPrice = '$' + memberPrice;
        }

        // Promo price (if explicitly marked as sale price)
        const promoPriceElement = packElement.querySelector('.pack__price.sale-price');
        if (promoPriceElement) {
          promoPrice = promoPriceElement.textContent.trim().replace(/[^\d.]/g, '');
          if (promoPrice) promoPrice = '$' + promoPrice;
        }

        products.push({
          'Product ID': productId,
          'Product URL': window.location.href,
          'Image URL': imageUrl,
          'Name': fullName,
          'Brand': brand,
          'Style': style,
          'ABV': abv,
          'Description': description,
          'Rating': rating,
          'Review': review,
          'Bundle': bundle,
          'Stock': stock,
          'Non-Member Price': nonMemberPrice,
          'Promo Price': promoPrice,
          'Discount Price': discountPrice,
          'Member Price': memberPrice
        });
      });
    } else {
      // Fallback: create single product entry
      let nonMemberPrice = 'N/A';
      let memberPrice = 'N/A';
      let bundle = 'N/A';

      // Check for single item pricing
      const singlePriceElement = document.querySelector('.instore__message');
      if (singlePriceElement) {
        nonMemberPrice = singlePriceElement.textContent.trim().replace(/[^\d.]/g, '');
        if (nonMemberPrice) nonMemberPrice = '$' + nonMemberPrice;
        bundle = 'Single';
      }

      products.push({
        'Product ID': productId,
        'Product URL': window.location.href,
        'Image URL': imageUrl,
        'Name': fullName,
        'Brand': brand,
        'Style': style,
        'ABV': abv,
        'Description': description,
        'Rating': rating,
        'Review': review,
        'Bundle': bundle,
        'Stock': stock,
        'Non-Member Price': nonMemberPrice,
        'Promo Price': 'N/A',
        'Discount Price': 'N/A',
        'Member Price': memberPrice
      });
    }
  } catch (e) {
    console.error('Error extracting pricing:', e);
    // Return basic product info if pricing extraction fails
    products.push({
      'Product ID': productId,
      'Product URL': window.location.href,
      'Image URL': imageUrl,
      'Name': fullName,
      'Brand': brand,
      'Style': style,
      'ABV': abv,
      'Description': description,
      'Rating': rating,
      'Review': review,
      'Bundle': 'N/A',
      'Stock': stock,
      'Non-Member Price': 'N/A',
      'Promo Price': 'N/A',
      'Discount Price': 'N/A',
      'Member Price': 'N/A'
    });
  }

  return products;
}

// Function to check and resume navigation on page load
function checkNavigationOnLoad() {
  // Only resume navigation on product pages.
  if (!window.location.href.includes('/product/')) {
    return;
  }

  const links = JSON.parse(sessionStorage.getItem('dmProductLinks') || '[]');
  const navigating = links.length > 0 && sessionStorage.getItem('dmCurrentLinkIndex') !== null;

  if (navigating && !isAutoLoading) {
    // Poll for page readiness with a timeout
    const maxAttempts = 50; // 5 seconds at 100ms intervals
    let attempts = 0;
    const checkReady = setInterval(() => {
      if (document.readyState === 'complete' || attempts >= maxAttempts) {
        clearInterval(checkReady);
        if (document.readyState === 'complete') {
          console.log('Page fully loaded, extracting data and resuming navigation after 3 seconds');
          setTimeout(() => {
            // Simulate clicks on expansion panels before extracting details
            try {
              const styleProfileHeader = document.getElementById('mat-expansion-panel-header-2');
              if (styleProfileHeader) {
                const clickEvent = new Event('click', { bubbles: true });
                styleProfileHeader.dispatchEvent(clickEvent);
              }
            } catch (e) {
              console.error('Could not click style profile header:', e);
            }
            try {
              const productSpecsHeader = document.getElementById('mat-expansion-panel-header-1');
              if (productSpecsHeader) {
                const clickEvent = new Event('click', { bubbles: true });
                productSpecsHeader.dispatchEvent(clickEvent);
              }
            } catch (e) {
              console.error('Could not click product specs header:', e);
            }
            // Now extract product details
            console.log('Extracting product details...');
            const productVariants = extractProductDetails();
            let scrapedData = JSON.parse(sessionStorage.getItem('dmScrapedData') || '[]');

            // Add all product variants to scraped data, checking for duplicates
            let newProductsAdded = 0;
            productVariants.forEach(variant => {
              // Check if this exact row already exists
              const isDuplicate = scrapedData.some(existingRow => {
                return JSON.stringify(existingRow) === JSON.stringify(variant);
              });

              if (!isDuplicate) {
                scrapedData.push(variant);
                newProductsAdded++;
              } else {
                console.log(`Duplicate found for Product ID: ${variant['Product ID']}, Bundle: ${variant['Bundle']} - skipping`);
              }
            });

            sessionStorage.setItem('dmScrapedData', JSON.stringify(scrapedData));
            console.log(`Added ${newProductsAdded} new products, skipped ${productVariants.length - newProductsAdded} duplicates`);
            const totalScraped = scrapedData.length;
            const totalLinks = links.length;
            const productName = productVariants.length > 0 ? productVariants[0].Name : 'Unknown Product';
            console.log(`Data extracted for ${productName} (${productVariants.length} variants). Progress: ${totalScraped} records from ${sessionStorage.getItem('dmCurrentLinkIndex')}/${totalLinks} products`);

            // Update download button progress
            updateDownloadProgress();

            try {
              chrome.runtime.sendMessage({
                action: 'statusUpdate',
                message: `Status: Scraping ${totalScraped}`,
                isRunning: true
              });
            } catch (e) {
              console.log('Could not send message to popup:', e);
            }

            startLinkNavigation();
          }, 3000); // Wait 3 seconds after page load
        } else {
          console.error('Page load timeout, attempting navigation anyway');
          startLinkNavigation();
        }
      }
      attempts++;
    }, 100); // Check every 100ms
  }
}

// Function to start auto loading
function startAutoLoading() {
  if (isAutoLoading) return;

  isAutoLoading = true;
  clickCount = 0;
  productLinks.clear();
  sessionStorage.removeItem('dmProductLinks');
  sessionStorage.removeItem('dmCurrentLinkIndex');
  sessionStorage.removeItem('dmScrapedData');

  console.log('Starting auto loading of Dan Murphy\'s products...');

  try {
    chrome.runtime.sendMessage({
      action: 'statusUpdate',
      message: 'Status: Starting auto loading...',
      isRunning: true
    });
  } catch (e) {
    console.log('Could not send message to popup:', e);
  }

  setTimeout(() => {
    if (isAutoLoading) {
      collectProductLinks();
      clickShowMoreButton();
    }
  }, 1000);
}

// Function to stop auto loading
function stopAutoLoading() {
  isAutoLoading = false;
  console.log('Auto loading stopped.');

  try {
    chrome.runtime.sendMessage({
      action: 'statusUpdate',
      message: `Status: Stopped (${clickCount} clicks completed)`,
      isRunning: false
    });
  } catch (e) {
    console.log('Could not send message to popup:', e);
  }
}

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startAutoLoading') {
    startAutoLoading();
    sendResponse({ success: true });
  } else if (request.action === 'stopAutoLoading') {
    stopAutoLoading();
    sendResponse({ success: true });
  } else if (request.action === 'continueNavigation') {
    checkNavigationOnLoad();
    sendResponse({ success: true });
  } else if (request.action === 'getProgress') {
    const scrapedData = JSON.parse(sessionStorage.getItem('dmScrapedData') || '[]');
    const totalLinks = JSON.parse(sessionStorage.getItem('dmProductLinks') || '[]').length;
    sendResponse({
      scrapedCount: scrapedData.length,
      totalCount: totalLinks
    });
  } else if (request.action === 'downloadProgress') {
    downloadCurrentProgress(request.format);
    sendResponse({ success: true });
  }
  return true;
});

// Add visual indicator
function addVisualIndicator() {
  if (document.getElementById('dm-auto-loader-indicator')) return;

  const indicator = document.createElement('div');
  indicator.id = 'dm-auto-loader-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #4CAF50;
    color: white;
    padding: 10px;
    border-radius: 5px;
    z-index: 10000;
    font-family: Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  `;
  indicator.innerHTML = '🤖 Dan Murphy\'s Auto Loader Ready<br><small>Use extension popup to start</small>';
  document.body.appendChild(indicator);

  setTimeout(() => {
    const elem = document.getElementById('dm-auto-loader-indicator');
    if (elem) elem.remove();
  }, 5000);
}

// Initialize
function initialize() {
  addVisualIndicator();
  checkNavigationOnLoad(); // Check for navigation on page load
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

console.log('Dan Murphy\'s Auto Loader content script loaded');