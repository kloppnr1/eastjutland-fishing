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

    const badgeBox = await badge.boundingBox();
    if (!badgeBox) throw new Error('Badge not found');

    // Click the badge
    await badge.locator('div[style*="background: white"]').first().click();

    // Wait for popup
    const popup = page.locator('.leaflet-popup');
    await expect(popup).toBeVisible({ timeout: 3000 });

    const popupBox = await popup.boundingBox();
    if (!popupBox) throw new Error('Popup not found');

    // Popup bottom should be above badge top (with some tolerance)
    // popupBox.y + popupBox.height should be <= badgeBox.y + small tolerance
    const popupBottom = popupBox.y + popupBox.height;
    const badgeTop = badgeBox.y;

    console.log(`Popup bottom: ${popupBottom}, Badge top: ${badgeTop}`);

    // Allow 20px overlap tolerance due to stem/rotation
    expect(popupBottom).toBeLessThanOrEqual(badgeTop + 20);
  });
});
