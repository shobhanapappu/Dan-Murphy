
# Dan Murphy's Auto Loader & Scraper

This Chrome extension automates the process of loading all products on a Dan Murphy's category page and then scrapes detailed information for each product.

## Features

- **Auto Loader**: Automatically clicks the "Show 24 more" button until all products on the page are loaded.
- **Product Link Scraping**: Gathers all unique product links from the loaded page.
- **Detailed Product Scraping**: Navigates to each product page to scrape detailed information, including:
  - Product Name
  - Price
  - Product URL
  - Image URL
  - Stock Status
  - Product Details (Description, Size, Alcohol Content, etc.)
- **Data Export**: Allows you to download the scraped data in both CSV and JSON formats.
- **Progress Tracking**: A floating UI element shows the scraping progress.

## How to Use

1. **Navigate to a Category Page**: Open a category page on the Dan Murphy's website (e.g., [Craft Beer](https://www.danmurphys.com.au/beer/craft-beer)).
2. **Start Auto Loading**: Click the extension icon in your browser toolbar and click the "Start Auto Loading" button.
3. **Wait for Links to be Collected**: The extension will automatically click all "Show 24 more" buttons. A confirmation dialog will appear when all product links have been collected.
4. **Start Scraping**: Click the "Start Navigating Links" button in the confirmation dialog to begin scraping the product details.
5. **Monitor Progress**: A progress indicator will appear on the right side of the page, showing how many products have been scraped.
6. **Download Data**: At any point during the scraping process, you can click the "Download CSV" or "Download JSON" buttons to download the data collected so far. Once scraping is complete, the files will be downloaded automatically.

## Files

- `manifest.json`: Defines the extension's properties, permissions, and scripts.
- `popup.html`: The HTML structure for the extension's popup.
- `popup.js`: Handles the logic for the popup, including starting and stopping the auto-loading process.
- `content.js`: The core script that interacts with the Dan Murphy's website. It handles the auto-loading, link collection, and product data scraping.
- `background.js`: A background script for managing the extension's state (though it is currently empty). 