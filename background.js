// This is a service worker for the Chrome extension.

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // When a tab is updated, check if it's a Dan Murphy's page and if loading is complete.
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('danmurphys.com.au')) {
    // Send a message to the content script to check if it should continue navigation.
    // This is a fallback mechanism to ensure navigation continues even if the content
    // script's own load trigger fails.
    chrome.tabs.sendMessage(tabId, { action: 'continueNavigation' })
      .catch(error => {
        // It's common for this to fail if the content script is not injected on a page,
        // or if it's not ready. We can safely ignore these errors.
        if (!error.message.includes('Receiving end does not exist')) {
          console.warn('Could not send continueNavigation message:', error.message);
        }
      });
  }
});

// Listener for messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // This can be used for communication between content scripts, popups, and the background script.
  if (request.action === "navigateToLink") {
    if (sender.tab) {
      chrome.tabs.update(sender.tab.id, {url: request.url});
      sendResponse({success: true});
    } else {
      console.error("navigateToLink requires a sender tab");
      sendResponse({success: false});
    }
  }

  // Keep the message channel open for an asynchronous response
  return true; 
}); 