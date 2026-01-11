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

  test('clicking on badge expands it', async ({ page }) => {
    // Find a weather badge marker
    const badge = page.locator('.weather-badge-marker').first();
    await expect(badge).toBeVisible();

    // Click on the badge (the white box part)
    await badge.locator('div[style*="background: white"]').first().click();

    // Expanded badge should appear
    const expandedBadge = page.locator('.expanded-badge-marker');
    await expect(expandedBadge).toBeVisible({ timeout: 3000 });

    // Should show spot name and stats
    const expandedContent = page.locator('.expanded-badge-content');
    await expect(expandedContent).toBeVisible();
  });

  test('clicking on anchor dot expands badge', async ({ page }) => {
    // Find a weather badge marker
    const badge = page.locator('.weather-badge-marker').first();
    await expect(badge).toBeVisible();

    // Click on the anchor dot (blue circle)
    await badge.locator('div[style*="background: #3b82f6"]').click();

    // Expanded badge should appear
    const expandedBadge = page.locator('.expanded-badge-marker');
    await expect(expandedBadge).toBeVisible({ timeout: 3000 });
  });

  test('clicking empty space near badge does NOT expand it', async ({ page }) => {
    // Get first badge position
    const badge = page.locator('.weather-badge-marker').first();
    await expect(badge).toBeVisible();

    const box = await badge.boundingBox();
    if (!box) throw new Error('Badge not found');

    // Click 50px above the badge (should be empty space)
    await page.mouse.click(box.x + box.width / 2, box.y - 50);

    // Wait a moment
    await page.waitForTimeout(500);

    // Expanded badge should NOT appear
    const expandedBadge = page.locator('.expanded-badge-marker');
    await expect(expandedBadge).not.toBeVisible();
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

test.describe('Expanded Badge', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5000/map');
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(2000);
  });

  test('expanded badge shows spot details', async ({ page }) => {
    // Find and click a badge
    const badge = page.locator('.weather-badge-marker').first();
    await expect(badge).toBeVisible();

    // Click the badge to expand
    await badge.locator('div[style*="background: white"]').first().click();

    // Wait for expanded badge
    const expandedBadge = page.locator('.expanded-badge-marker');
    await expect(expandedBadge).toBeVisible({ timeout: 3000 });

    // Take screenshot
    await page.screenshot({ path: 'test-results/expanded-badge.png' });

    // Expanded badge should show stats (Vand, Luft labels)
    const content = page.locator('.expanded-badge-content');
    await expect(content).toContainText('Vand');
    await expect(content).toContainText('Luft');
  });

  test('clicking map closes expanded badge', async ({ page }) => {
    // Find and click a badge to expand
    const badge = page.locator('.weather-badge-marker').first();
    await badge.locator('div[style*="background: white"]').first().click();

    // Wait for expanded badge
    const expandedBadge = page.locator('.expanded-badge-marker');
    await expect(expandedBadge).toBeVisible({ timeout: 3000 });

    // Click on empty map area
    const map = page.locator('.leaflet-container');
    await map.click({ position: { x: 50, y: 50 } });
    await page.waitForTimeout(500);

    // Expanded badge should be gone, normal badges visible
    await expect(expandedBadge).not.toBeVisible();
    await expect(page.locator('.weather-badge-marker').first()).toBeVisible();
  });

  test('clicking different badge switches selection', async ({ page }) => {
    // Get all badges
    const badges = page.locator('.weather-badge-marker');
    const count = await badges.count();

    if (count < 2) {
      test.skip();
      return;
    }

    // Click first badge
    await badges.nth(0).locator('div[style*="background: white"]').first().click();
    await page.waitForTimeout(500);

    // Should have one expanded badge
    let expandedBadges = page.locator('.expanded-badge-marker');
    await expect(expandedBadges).toHaveCount(1);

    // Click second badge
    await badges.nth(1).locator('div[style*="background: white"]').first().click();
    await page.waitForTimeout(500);

    // Should still have one expanded badge (the second one now)
    expandedBadges = page.locator('.expanded-badge-marker');
    await expect(expandedBadges).toHaveCount(1);
  });
});
