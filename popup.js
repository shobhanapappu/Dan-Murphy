document.addEventListener('DOMContentLoaded', function() {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusDiv = document.getElementById('status');
  const downloadSection = document.getElementById('downloadSection');
  const progressInfo = document.getElementById('progressInfo');
  const downloadCsvBtn = document.getElementById('downloadCsvBtn');
  const downloadJsonBtn = document.getElementById('downloadJsonBtn');
  
  // Check if we're on the correct page
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentUrl = tabs[0].url;
    if (!currentUrl.includes('danmurphys.com.au/beer/craft-beer')) {
      statusDiv.textContent = 'Please navigate to Dan Murphy\'s craft beer page first';
      statusDiv.className = 'status stopped';
      startBtn.disabled = true;
    }
  });
  
  // Function to update download progress
  function updateDownloadProgress() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'getProgress'}, function(response) {
        if (response && response.scrapedCount > 0) {
          downloadSection.style.display = 'block';
          progressInfo.textContent = `${response.scrapedCount} products scraped`;
        } else {
          downloadSection.style.display = 'none';
        }
      });
    });
  }
  
  startBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'startAutoLoading'}, function(response) {
        if (response && response.success) {
          startBtn.disabled = true;
          stopBtn.disabled = false;
          statusDiv.textContent = 'Status: Running - Auto loading products...';
          statusDiv.className = 'status running';
        } else {
          statusDiv.textContent = 'Error: Could not start auto loading';
          statusDiv.className = 'status stopped';
        }
      });
    });
  });
  
  stopBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'stopAutoLoading'}, function(response) {
        if (response && response.success) {
          startBtn.disabled = false;
          stopBtn.disabled = true;
          statusDiv.textContent = 'Status: Stopped';
          statusDiv.className = 'status stopped';
        }
      });
    });
  });
  
  downloadCsvBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'downloadProgress', format: 'csv'});
    });
  });
  
  downloadJsonBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'downloadProgress', format: 'json'});
    });
  });
  
  // Listen for status updates from content script
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'statusUpdate') {
      statusDiv.textContent = request.message;
      if (request.isRunning) {
        statusDiv.className = 'status running';
        startBtn.disabled = true;
        stopBtn.disabled = false;
        // Update download progress when scraping is running
        updateDownloadProgress();
      } else {
        statusDiv.className = 'status stopped';
        startBtn.disabled = false;
        stopBtn.disabled = true;
      }
    }
  });
  
  // Update download progress when popup opens
  updateDownloadProgress();
  
  // Update progress every 2 seconds when popup is open
  setInterval(updateDownloadProgress, 2000);
});