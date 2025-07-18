let isAutoLoading = false;
let clickCount = 0;
let productLinks = new Set(); // Store unique links
let isNavigating = false;
let downloadButton = null; // Global reference to download button

// Function to collect the first product link from each <li> with classes js-list and search-results__item
function collectProductLinks() {
  const listItems = document.querySelectorAll('li.js-list.search-results__item');
  listItems.forEach(item => {
    const link = item.querySelector('a[href*="/product/DM_"]'); // Get the first link only
    if (link && link.href.includes('danmurphys.com.au/product/DM_')) {
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
      <div style="font-weight: bold; margin-bottom: 5px;">📥 Download Progress</div>
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
      progressDiv.textContent = `${scrapedData.length}/${totalLinks} products scraped`;
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

// Function to show confirmation UI
function showConfirmation() {
  const confirmationDiv = document.createElement('div');
  confirmationDiv.id = 'dm-link-navigator';
  confirmationDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #fff;
    padding: 20px;
    border-radius: 10px;
    z-index: 10001;
    font-family: Arial, sans-serif;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    max-height: 80vh;
    overflow-y: auto;
  `;
  confirmationDiv.innerHTML = `
    <h3>Collected ${productLinks.size} Unique Product Links</h3>
    <ul style="max-height: 50vh; overflow-y: auto;">
      ${Array.from(productLinks).map(link => `<li>${link}</li>`).join('')}
    </ul>
    <button id="navigateLinksBtn" style="margin-top: 10px; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
      Start Navigating Links
    </button>
    <button id="cancelNavigateBtn" style="margin-top: 10px; margin-left: 10px; padding: 10px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer;">
      Cancel
    </button>
  `;
  document.body.appendChild(confirmationDiv);

  document.getElementById('navigateLinksBtn').addEventListener('click', () => {
    confirmationDiv.remove();
    // Save the links to session storage before starting navigation
    sessionStorage.setItem('dmProductLinks', JSON.stringify(Array.from(productLinks)));
    sessionStorage.setItem('dmCurrentLinkIndex', '0');
    sessionStorage.setItem('dmScrapedData', '[]'); // Initialize scraped data
    createDownloadButton(); // Create download button immediately
    startLinkNavigation();
  });

  document.getElementById('cancelNavigateBtn').addEventListener('click', () => {
    confirmationDiv.remove();
    productLinks.clear();
    sessionStorage.removeItem('dmProductLinks');
    sessionStorage.removeItem('dmCurrentLinkIndex');
    sessionStorage.removeItem('dmScrapedData');
    if (downloadButton) downloadButton.remove();
    try {
      chrome.runtime.sendMessage({
        action: 'statusUpdate',
        message: 'Status: Navigation cancelled',
        isRunning: false
      });
    } catch (e) {
      console.log('Could not send message to popup:', e);
    }
  });
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

    const allKeys = new Set();
    data.forEach(item => {
        Object.keys(item).forEach(key => {
            if (typeof item[key] === 'object' && item[key] !== null) {
                Object.keys(item[key]).forEach(subKey => {
                    allKeys.add(`${key}_${subKey}`);
                });
            } else {
                allKeys.add(key);
            }
        });
    });

    const headers = Array.from(allKeys);
    const csvRows = [headers.join(',')];

    data.forEach(item => {
        const values = headers.map(header => {
            let value = '';
            const [mainKey, subKey] = header.split('_');
            if (subKey && typeof item[mainKey] === 'object' && item[mainKey] !== null) {
                value = item[mainKey][subKey];
            } else if (!subKey) {
                value = item[header];
            }

            if (typeof value === 'string') {
                const sanitizedValue = value.replace(/"/g, '""');
                return `"${sanitizedValue}"`;
            }
            if (typeof value === 'object' && value !== null) {
                return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            }
            return value;
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
    const productDetails = {};

    try {
        productDetails.name = document.querySelector('.product-title__name').textContent.trim();
    } catch (e) {
        productDetails.name = 'N/A';
    }

    try {
        productDetails.brand = document.querySelector('.product-title__brand').textContent.trim();
    } catch (e) {
        productDetails.brand = 'N/A';
    }

    try {
        productDetails.description = document.querySelector('.product-skeleton__details-description-reg')?.textContent.trim() || 'N/A';
    } catch (e) {
        productDetails.description = 'N/A';
    }

    try {
        productDetails.independentBrewery = document.querySelector('.product-usp__container img[alt="Independent"]') ? 'Independent brewery' : 'N/A';
    } catch (e) {
        productDetails.independentBrewery = 'N/A';
    }

    try {
        productDetails.region = document.querySelector('.product-usp__container img[alt="Region"]')?.nextElementSibling.textContent.trim() || 'N/A';
    } catch (e) {
        productDetails.region = 'N/A';
    }

    try {
        productDetails.standardDrinks = document.querySelector('.aprofile__item img[alt="standard drinks"]')?.parentElement.querySelector('.aprofile__value').textContent.trim() || 'N/A';
    } catch (e) {
        productDetails.standardDrinks = 'N/A';
    }

    try {
        productDetails.alcoholVolume = document.querySelector('.aprofile__item img[alt="alcohol percent"]')?.parentElement.querySelector('.aprofile__value').textContent.trim() || 'N/A';
    } catch (e) {
        productDetails.alcoholVolume = 'N/A';
    }

    try {
        productDetails.styleProfile = {
            type: document.querySelector('.style-profile__image[alt="IPA"]') ? 'IPA' : 'N/A',
            description: document.querySelector('.style-profile__description')?.textContent.trim() || 'N/A',
            keywords: Array.from(document.querySelectorAll('.style-profile__keywords span')).map(span => span.textContent.trim()).join(', ') || 'N/A'
        };
    } catch (e) {
        productDetails.styleProfile = { type: 'N/A', description: 'N/A', keywords: 'N/A' };
    }

    try {
        productDetails.awards = document.querySelector('.product-skeleton__details-awards-award')?.textContent.trim() || 'N/A';
    } catch (e) {
        productDetails.awards = 'N/A';
    }

    try {
        const attributes = {};
        document.querySelectorAll('.product-attribute__item').forEach(item => {
            const key = item.querySelector('.product-attribute__item-key').textContent.trim();
            const value = item.querySelector('.product-attribute__item-value').textContent.trim();
            attributes[key] = value;
        });
        productDetails.specifications = attributes;
    } catch (e) {
        productDetails.specifications = {};
    }

    try {
        productDetails.pricing = {
            pack4: {
                memberPrice: document.querySelector('.pack__price--member')?.textContent.trim() || 'N/A',
                nonMemberPrice: document.querySelector('.pack__price-offer span')?.textContent.trim() || 'N/A',
                perUnitInStore: document.querySelector('.instore__message')?.textContent.trim() || 'N/A'
            },
            case16: {
                price: document.querySelectorAll('.pack__price')[1]?.textContent.trim() || 'N/A'
            }
        };
    } catch (e) {
        productDetails.pricing = { pack4: { memberPrice: 'N/A', nonMemberPrice: 'N/A', perUnitInStore: 'N/A' }, case16: { price: 'N/A' } };
    }

    try {
        productDetails.availability = {
            pickup: document.querySelector('.fulfilment-options__available-pickup')?.textContent.trim() || 'N/A',
            delivery: document.querySelectorAll('.mat-chip-list .mat-lime span')?.[1]?.textContent.trim() || 'N/A'
        };
    } catch (e) {
        productDetails.availability = { pickup: 'N/A', delivery: 'N/A' };
    }

    try {
        productDetails.images = Array.from(document.querySelectorAll('.zoom__image')).map(img => img.getAttribute('src')).filter(src => src) || ['N/A'];
    } catch (e) {
        productDetails.images = ['N/A'];
    }

    try {
        productDetails.storeLocation = document.querySelector('.fulfilment-options__header-location')?.textContent.trim() || 'N/A';
    } catch (e) {
        productDetails.storeLocation = 'N/A';
    }

    try {
        productDetails.memberOffer = document.querySelector('.promo-chip__chip .mat-gold')?.textContent.trim() || 'N/A';
    } catch (e) {
        productDetails.memberOffer = 'N/A';
    }

    return productDetails;
}

// Function to check and resume navigation on page load
function checkNavigationOnLoad() {
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
            const productDetails = extractProductDetails();
            productDetails.url = window.location.href;
            let scrapedData = JSON.parse(sessionStorage.getItem('dmScrapedData') || '[]');
            scrapedData.push(productDetails);
            sessionStorage.setItem('dmScrapedData', JSON.stringify(scrapedData));
            const totalScraped = scrapedData.length;
            const totalLinks = links.length;
            console.log(`Data extracted for ${productDetails.name}. Progress: ${totalScraped}/${totalLinks}`);
            
            // Update download button progress
            updateDownloadProgress();
            
            try {
                chrome.runtime.sendMessage({
                    action: 'statusUpdate',
                    message: `Status: Scraping ${totalScraped}/${totalLinks}`,
                    isRunning: true
                });
            } catch(e) {
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