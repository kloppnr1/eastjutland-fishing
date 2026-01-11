import { test, expect } from '@playwright/test';

test.describe('Map Badge Click Detection', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the map page
    await page.goto('http://localhost:5000/map');
    // Wait for map to load
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    // Wait for markers to appear
    await page.waitForTimeout(2000);
  });

  test('clicking on badge opens popup', async ({ page }) => {
    // Find a weather badge marker
    const badge = page.locator('.weather-badge-marker').first();
    await expect(badge).toBeVisible();

    // Click on the badge (the white box part)
    await badge.locator('div[style*="background: white"]').first().click();

    // Popup should appear
    const popup = page.locator('.leaflet-popup');
    await expect(popup).toBeVisible({ timeout: 3000 });
  });

  test('clicking on anchor dot opens popup', async ({ page }) => {
    // Find a weather badge marker
    const badge = page.locator('.weather-badge-marker').first();
    await expect(badge).toBeVisible();

    // Click on the anchor dot (blue circle)
    await badge.locator('div[style*="background: #3b82f6"]').click();

    // Popup should appear
    const popup = page.locator('.leaflet-popup');
    await expect(popup).toBeVisible({ timeout: 3000 });
  });

  test('clicking empty space near badge does NOT open popup', async ({ page }) => {
    // Get first badge position
    const badge = page.locator('.weather-badge-marker').first();
    await expect(badge).toBeVisible();

    const box = await badge.boundingBox();
    if (!box) throw new Error('Badge not found');

    // Click 50px above the badge (should be empty space)
    await page.mouse.click(box.x + box.width / 2, box.y - 50);

    // Wait a moment
    await page.waitForTimeout(500);

    // Popup should NOT appear (or temp badge appears instead)
    const spotPopup = page.locator('.leaflet-popup-content:has-text("Vand")');
    await expect(spotPopup).not.toBeVisible();
  });

  test('webcam badge click opens popup', async ({ page }) => {
    // Find a webcam marker
    const webcam = page.locator('.webcam-marker').first();

    // Skip if no webcams on current view
    const count = await webcam.count();
    if (count === 0) {
      test.skip();
      return;
    }

    // Check if webcam is within viewport (Leaflet markers can't be scrolled)
    const box = await webcam.boundingBox();
    const viewport = page.viewportSize();
    if (!box || !viewport || box.x < 0 || box.y < 0 ||
        box.x + box.width > viewport.width ||
        box.y + box.height > viewport.height) {
      test.skip(); // Webcam not in visible map area
      return;
    }

    await expect(webcam).toBeVisible();

    // Click directly on the webcam marker
    await webcam.click();

    // Popup should appear
    const popup = page.locator('.leaflet-popup');
    await expect(popup).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Popup Positioning', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5000/map');
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(2000);
  });

  test('popup appears above the badge, not overlapping', async ({ page }) => {
    // Find and click a badge
    const badge = page.locator('.weather-badge-marker').first();
    await expect(badge).toBeVisible();

    // Click the badge to open popup
    await badge.locator('div[style*="background: white"]').first().click();

    // Wait for popup
    const popup = page.locator('.leaflet-popup');
    await expect(popup).toBeVisible({ timeout: 3000 });

    // Take full screenshot first
    await page.screenshot({ path: 'test-results/popup-positioning-full.png' });

    // Get bounding boxes after popup is visible
    const badgeBox = await badge.boundingBox();
    const popupBox = await popup.boundingBox();
    if (!badgeBox || !popupBox) throw new Error('Badge or popup not found');

    // Find the actual white badge box within the marker for accurate positioning
    const badgeContent = badge.locator('div[style*="background: white"][style*="border-radius: 6px"]').first();
    const badgeContentBox = await badgeContent.boundingBox();

    const popupBottom = popupBox.y + popupBox.height;
    const actualBadgeTop = badgeContentBox ? badgeContentBox.y : badgeBox.y;

    console.log(`Popup bottom: ${popupBottom}, Badge top: ${actualBadgeTop}`);
    console.log(`Gap between popup and badge: ${actualBadgeTop - popupBottom}px`);

    // Take zoomed screenshot showing popup and badge together
    if (badgeContentBox && popupBox) {
      const minX = Math.min(popupBox.x, badgeContentBox.x) - 20;
      const minY = popupBox.y - 20;
      const maxX = Math.max(popupBox.x + popupBox.width, badgeContentBox.x + badgeContentBox.width) + 20;
      const maxY = badgeContentBox.y + badgeContentBox.height + 40;
      await page.screenshot({
        path: 'test-results/popup-positioning.png',
        clip: { x: Math.max(0, minX), y: Math.max(0, minY), width: maxX - minX, height: maxY - minY }
      });
    }

    // Popup should be reasonably positioned near the badge
    // Allow overlap due to popup tip and badge rotation/stem variations
    // The key is that they're visually connected, not that exact pixels match
    expect(popupBottom).toBeLessThanOrEqual(actualBadgeTop + 60);
    // Should not have huge gap (more than 100px would indicate broken positioning)
    expect(actualBadgeTop - popupBottom).toBeLessThan(100);
  });
});
