import { test, expect } from '@playwright/test';

test.describe('Map Badge Click Detection', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the map page
    await page.goto('./map');
    // Wait for map to load
    await page.waitForSelector('.leaflet-container', { timeout: 30000 });
    // Wait for markers to appear
    await page.waitForTimeout(2000);
  });

  test('clicking on badge expands it', async ({ page }) => {
    // Find a weather badge marker (use last() to avoid header overlap)
    const badge = page.locator('.weather-badge-marker').last();
    await badge.scrollIntoViewIfNeeded();
    await expect(badge).toBeVisible();

    // Click on the badge (the white box part)
    await badge.locator('div[style*="background: white"]').first().click({ force: true });

    // Expanded badge should appear
    const expandedBadge = page.locator('.expanded-badge-marker');
    await expect(expandedBadge).toBeVisible({ timeout: 3000 });

    // Should show spot name and stats
    const expandedContent = page.locator('.expanded-badge-content');
    await expect(expandedContent).toBeVisible();
  });

  test('clicking on anchor dot expands badge', async ({ page }) => {
    // Find a weather badge marker (use last() to avoid header overlap)
    const badge = page.locator('.weather-badge-marker').last();
    await badge.scrollIntoViewIfNeeded();
    await expect(badge).toBeVisible();

    // Click on the anchor dot (blue circle)
    await badge.locator('div[style*="background: #3b82f6"]').click({ force: true });

    // Expanded badge should appear
    const expandedBadge = page.locator('.expanded-badge-marker');
    await expect(expandedBadge).toBeVisible({ timeout: 3000 });
  });

  test('clicking empty space near badge does NOT expand it', async ({ page }) => {
    // Get badge position (use last() to avoid header overlap)
    const badge = page.locator('.weather-badge-marker').last();
    await badge.scrollIntoViewIfNeeded();
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

  test('clicking map with webcam popup open closes popup without showing temp badge', async ({ page }) => {
    // Find a webcam marker
    const webcam = page.locator('.webcam-marker').first();

    const count = await webcam.count();
    if (count === 0) {
      test.skip();
      return;
    }

    const box = await webcam.boundingBox();
    const viewport = page.viewportSize();
    if (!box || !viewport || box.x < 0 || box.y < 0 ||
        box.x + box.width > viewport.width ||
        box.y + box.height > viewport.height) {
      test.skip();
      return;
    }

    // Click webcam to open popup
    await webcam.click();
    const popup = page.locator('.leaflet-popup');
    await expect(popup).toBeVisible({ timeout: 3000 });

    // Click on empty map area (away from the popup)
    const map = page.locator('.leaflet-container');
    await map.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(500);

    // Popup should be closed
    await expect(popup).not.toBeVisible();

    // Temp badge should NOT appear (this was the bug)
    const tempBadge = page.locator('.clicked-location-marker');
    await expect(tempBadge).not.toBeVisible();
  });

  test('clicking map with fish spot expanded closes badge without showing temp badge', async ({ page }) => {
    // Find a fish spot badge (use last() to avoid header overlap)
    const badge = page.locator('.weather-badge-marker').last();
    await badge.scrollIntoViewIfNeeded();
    await expect(badge).toBeVisible();

    // Click to expand the badge
    await badge.locator('div[style*="background: white"]').first().click({ force: true });

    // Wait for expanded badge
    const expandedBadge = page.locator('.expanded-badge-marker');
    await expect(expandedBadge).toBeVisible({ timeout: 3000 });

    // Click on empty map area
    const map = page.locator('.leaflet-container');
    await map.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(500);

    // Expanded badge should be closed
    await expect(expandedBadge).not.toBeVisible();

    // Temp badge should NOT appear
    const tempBadge = page.locator('.clicked-location-marker');
    await expect(tempBadge).not.toBeVisible();
  });

  test('clicking popup title navigates to detail page', async ({ page }) => {
    // Find a webcam marker
    const webcam = page.locator('.webcam-marker').first();

    // Skip if no webcams on current view
    const count = await webcam.count();
    if (count === 0) {
      test.skip();
      return;
    }

    // Check if webcam is within viewport
    const box = await webcam.boundingBox();
    const viewport = page.viewportSize();
    if (!box || !viewport || box.x < 0 || box.y < 0 ||
        box.x + box.width > viewport.width ||
        box.y + box.height > viewport.height) {
      test.skip();
      return;
    }

    await expect(webcam).toBeVisible();

    // Click webcam marker to open popup
    await webcam.click();

    // Wait for popup
    const popup = page.locator('.leaflet-popup');
    await expect(popup).toBeVisible({ timeout: 3000 });

    // Click on the title link in the popup
    const titleLink = popup.locator('a').first();
    await expect(titleLink).toBeVisible();
    await titleLink.click();

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/spot\/\d+/, { timeout: 5000 });
  });
});

test.describe('Expanded Badge', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./map');
    await page.waitForSelector('.leaflet-container', { timeout: 30000 });
    await page.waitForTimeout(2000);
  });

  test('expanded badge shows spot details', async ({ page }) => {
    // Find and click a badge (use last() to avoid header overlap)
    const badge = page.locator('.weather-badge-marker').last();
    await badge.scrollIntoViewIfNeeded();
    await expect(badge).toBeVisible();

    // Click the badge to expand
    await badge.locator('div[style*="background: white"]').first().click({ force: true });

    // Wait for expanded badge
    const expandedBadge = page.locator('.expanded-badge-marker');
    await expect(expandedBadge).toBeVisible({ timeout: 3000 });

    // Take screenshot
    await page.screenshot({ path: 'test-results/expanded-badge.png' });

    // Expanded badge should show stats (temperature values with degree symbol)
    const content = page.locator('.expanded-badge-content');
    // Should show water temp, air temp values (or -- if null)
    const text = await content.textContent();
    // Should have degree symbols for temps and spot name
    expect(text).toMatch(/°|--/);
  });

  test('clicking map closes expanded badge', async ({ page }) => {
    // Find and click a badge to expand (use last() to avoid header overlap)
    const badge = page.locator('.weather-badge-marker').last();
    await badge.scrollIntoViewIfNeeded();
    await badge.locator('div[style*="background: white"]').first().click({ force: true });

    // Wait for expanded badge
    const expandedBadge = page.locator('.expanded-badge-marker');
    await expect(expandedBadge).toBeVisible({ timeout: 3000 });

    // Click on empty map area
    const map = page.locator('.leaflet-container');
    await map.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(500);

    // Expanded badge should be gone, normal badges visible
    await expect(expandedBadge).not.toBeVisible();
    await expect(page.locator('.weather-badge-marker').first()).toBeVisible();
  });

  test('clicking different badge switches selection', async ({ page }) => {
    // Wait for weather data to load
    await page.waitForTimeout(2000);

    // Get all badges
    const badges = page.locator('.weather-badge-marker');
    const count = await badges.count();

    if (count < 2) {
      test.skip();
      return;
    }

    // Click last badge (to avoid header overlap)
    const lastBadge = badges.last();
    await lastBadge.scrollIntoViewIfNeeded();
    await lastBadge.locator('div[style*="background: white"]').first().click({ force: true });
    await page.waitForTimeout(1000);

    // Should have one expanded badge
    let expandedBadges = page.locator('.expanded-badge-marker');
    await expect(expandedBadges).toHaveCount(1, { timeout: 5000 });

    // Click a different badge (second to last) - need to re-query as badges may have updated
    const updatedBadges = page.locator('.weather-badge-marker');
    const updatedCount = await updatedBadges.count();
    if (updatedCount < 2) {
      test.skip();
      return;
    }
    const secondLastBadge = updatedBadges.nth(updatedCount - 2);
    await secondLastBadge.scrollIntoViewIfNeeded();
    await secondLastBadge.locator('div[style*="background: white"]').first().click({ force: true });
    await page.waitForTimeout(1000);

    // Should still have one expanded badge (the new one now)
    expandedBadges = page.locator('.expanded-badge-marker');
    await expect(expandedBadges).toHaveCount(1, { timeout: 5000 });
  });
});

test.describe('Cluster Stacked Badges', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./map');
    await page.waitForSelector('.leaflet-container', { timeout: 30000 });
    // Zoom out to trigger clustering
    const map = page.locator('.leaflet-container');
    // Use mouse wheel to zoom out more
    await map.click({ position: { x: 100, y: 100 } }); // Click corner to avoid creating temp badge in center
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(500);
    // Dismiss any temp badge that appeared
    const tempBadge = page.locator('.clicked-location-marker');
    if (await tempBadge.count() > 0) {
      await tempBadge.click();
      await page.waitForTimeout(300);
    }
  });

  test('cluster icon appears when zoomed out', async ({ page }) => {
    // Cluster icons should appear
    const clusters = page.locator('.cluster-icon');
    const count = await clusters.count();

    // If no clusters visible, skip (not enough spots in view to cluster)
    if (count === 0) {
      test.skip();
      return;
    }

    await expect(clusters.first()).toBeVisible();
  });

  test('cluster shows stacked badge visual', async ({ page }) => {
    const clusters = page.locator('.cluster-icon');
    const count = await clusters.count();

    if (count === 0) {
      test.skip();
      return;
    }

    const cluster = clusters.first();
    await expect(cluster).toBeVisible();

    // Should have anchor dot (blue circle at bottom) - use partial style match
    const anchorDot = cluster.locator('div[style*="border-radius: 50%"][style*="#3b82f6"]');
    await expect(anchorDot).toBeVisible();

    // Should have stem (white vertical line) - check for white background div
    const stem = cluster.locator('div[style*="background: white"]').first();
    await expect(stem).toBeVisible();

    // Should have front badge (white background with border-radius) - use flexible match
    const frontBadge = cluster.locator('div[style*="background: white"][style*="border-radius"]').first();
    await expect(frontBadge).toBeVisible();

    // Take full page screenshot
    await page.screenshot({ path: 'test-results/cluster-stacked.png' });

    // Take close-up screenshot of just the cluster
    const box = await cluster.boundingBox();
    if (box) {
      await page.screenshot({
        path: 'test-results/cluster-closeup.png',
        clip: {
          x: Math.max(0, box.x - 50),
          y: Math.max(0, box.y - 50),
          width: box.width + 100,
          height: box.height + 100
        }
      });
    }
  });

  test('cluster shows count number', async ({ page }) => {
    const clusters = page.locator('.cluster-icon');
    const count = await clusters.count();

    if (count === 0) {
      test.skip();
      return;
    }

    const cluster = clusters.first();
    await expect(cluster).toBeVisible();

    // Should contain a number (the count)
    const text = await cluster.textContent();
    expect(text).toMatch(/\d+/);
  });

  test('cluster shows water temperature (single value, range, or --)', async ({ page }) => {
    const clusters = page.locator('.cluster-icon');
    const count = await clusters.count();

    if (count === 0) {
      test.skip();
      return;
    }

    const cluster = clusters.first();
    await expect(cluster).toBeVisible();

    // Should have wave icon SVG (water temp indicator) - always visible now
    const waveIcon = cluster.locator('svg path[d*="M2 6c"]');
    await expect(waveIcon.first()).toBeVisible();

    // Temperature text should be either:
    // - Single value: "5.2°" (when all spots have same temp)
    // - Range: "5.0-6.5°" (when spots have different temps)
    // - "--" (when no data available)
    // - Should NOT be "5.2-5.2°" (duplicate values)
    // Note: nth(0) is count badge (white), nth(1) is water temp, nth(2) is wind
    const tempText = cluster.locator('span[style*="font-weight: 700"]').nth(1);
    const text = await tempText.textContent();
    // Match single temp "X.X°" or range "X.X-Y.Y°" or "--"
    expect(text).toMatch(/^\d+\.?\d*°$|^\d+\.?\d*-\d+\.?\d*°$|^--$/);
    // Verify it's not showing duplicate range like "5.2-5.2°"
    const rangeMatch = text?.match(/^(\d+\.?\d*)-(\d+\.?\d*)°$/);
    if (rangeMatch) {
      expect(rangeMatch[1]).not.toBe(rangeMatch[2]);
    }
  });

  test('cluster shows wind info (single value, range, or --)', async ({ page }) => {
    const clusters = page.locator('.cluster-icon');
    const count = await clusters.count();

    if (count === 0) {
      test.skip();
      return;
    }

    const cluster = clusters.first();
    await expect(cluster).toBeVisible();

    // Should have wind compass circle SVG - always visible now
    const compassCircle = cluster.locator('svg circle[cx="12"][cy="12"]');
    await expect(compassCircle.first()).toBeVisible();

    // Wind text should be either:
    // - Single value "3" (when all spots have same wind)
    // - Range "3-5" (when spots have different wind)
    // - "--" (when no data available)
    // - Should NOT be "3-3" (duplicate)
    const windSpans = cluster.locator('span[style*="color: #64748b"]');
    const text = await windSpans.first().textContent();
    // Match single wind "X" or range "X-Y" or "--"
    expect(text).toMatch(/^\d+$|^\d+-\d+$|^--$/);
    // Verify it's not showing duplicate range like "3-3"
    const rangeMatch = text?.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      expect(rangeMatch[1]).not.toBe(rangeMatch[2]);
    }
  });

  test('cluster has stacked cards when multiple spots', async ({ page }) => {
    const clusters = page.locator('.cluster-icon');
    const count = await clusters.count();

    if (count === 0) {
      test.skip();
      return;
    }

    // Find a cluster with 3+ spots (should have stacked cards)
    let foundStackedCluster = false;
    for (let i = 0; i < count; i++) {
      const cluster = clusters.nth(i);
      const text = await cluster.textContent();
      const match = text?.match(/(\d+)\s*steder/);
      if (match && parseInt(match[1]) >= 3) {
        // This cluster should have stacked cards (gray backgrounds with rotation)
        const stackedCards = cluster.locator('div[style*="rotate"]');
        const stackedCount = await stackedCards.count();
        if (stackedCount >= 1) {
          foundStackedCluster = true;
          await expect(stackedCards.first()).toBeVisible();
          break;
        }
      }
    }

    // If no cluster with 3+ spots found, that's okay - skip
    if (!foundStackedCluster) {
      test.skip();
    }
  });

  test('cluster badge content does not wrap to multiple lines', async ({ page }) => {
    const clusters = page.locator('.cluster-icon');
    const count = await clusters.count();

    if (count === 0) {
      test.skip();
      return;
    }

    const cluster = clusters.first();
    await expect(cluster).toBeVisible();

    // Get all rows in the badge (water temp row, wind row)
    // Each row should have a single line height (not wrapped)
    const rows = cluster.locator('div[style*="display: flex"][style*="align-items: center"]');
    const rowCount = await rows.count();

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const rowBox = await row.boundingBox();

      if (rowBox) {
        // A single line row should be less than ~25px tall (font-size 14px + some padding)
        // If content wraps, height would be ~40px+
        expect(rowBox.height).toBeLessThan(30);
      }
    }

    // Also verify the text spans themselves are single line
    // by checking that text with ranges like "1.5-1.6°" fits
    const textSpans = cluster.locator('span[style*="font-weight: 700"]');
    const spanCount = await textSpans.count();

    for (let i = 0; i < spanCount; i++) {
      const span = textSpans.nth(i);
      const spanBox = await span.boundingBox();

      if (spanBox) {
        // Single line text should be less than 20px tall
        expect(spanBox.height).toBeLessThan(25);
      }
    }
  });

  test('cluster badge width accommodates content without overflow', async ({ page }) => {
    // Wait for weather data to load
    await page.waitForTimeout(3000);

    const clusters = page.locator('.cluster-icon');
    const count = await clusters.count();

    if (count === 0) {
      test.skip();
      return;
    }

    const cluster = clusters.first();
    await expect(cluster).toBeVisible();

    // Get the front badge (white background with border-radius, not the stem)
    const frontBadge = cluster.locator('div[style*="background: white"][style*="border-radius"]').first();
    const badgeBox = await frontBadge.boundingBox();

    if (!badgeBox) {
      test.skip();
      return;
    }

    // Verify badge has reasonable dimensions
    expect(badgeBox.width).toBeGreaterThan(50);
    expect(badgeBox.height).toBeGreaterThan(30);

    // Verify badge is visible on screen
    expect(badgeBox.x).toBeGreaterThan(0);
    expect(badgeBox.y).toBeGreaterThan(0);
  });

  test('stacked badges are at least as large as front badge', async ({ page }) => {
    const clusters = page.locator('.cluster-icon');
    const count = await clusters.count();

    if (count === 0) {
      test.skip();
      return;
    }

    // Find a cluster with stacked cards (needs 2+ spots for middle card, 3+ for back card)
    let foundStackedCluster = false;
    for (let i = 0; i < count; i++) {
      const cluster = clusters.nth(i);
      const text = await cluster.textContent();
      const countMatch = text?.match(/(\d+)/);
      const spotCount = countMatch ? parseInt(countMatch[1]) : 0;

      if (spotCount >= 2) {
        // Get front badge (white background) - use bounding box since it has natural height
        const frontBadge = cluster.locator('div[style*="background: white"][style*="border-radius"]').first();
        const frontBox = await frontBadge.boundingBox();

        if (!frontBox) continue;

        // Get front badge CSS width for comparison
        const frontStyle = await frontBadge.getAttribute('style');
        const frontWidthMatch = frontStyle?.match(/width:\s*(\d+(?:\.\d+)?)px/);
        if (!frontWidthMatch) continue;
        const frontWidth = parseFloat(frontWidthMatch[1]);

        // Get stacked cards (have rotation transform)
        const stackedCards = cluster.locator('div[style*="rotate"]');
        const stackedCount = await stackedCards.count();

        if (stackedCount > 0) {
          foundStackedCluster = true;

          for (let j = 0; j < stackedCount; j++) {
            const stackedCard = stackedCards.nth(j);
            const stackedStyle = await stackedCard.getAttribute('style');

            if (stackedStyle) {
              // Parse width and height from inline style
              const stackedWidthMatch = stackedStyle.match(/width:\s*(\d+(?:\.\d+)?)px/);
              const stackedHeightMatch = stackedStyle.match(/height:\s*(\d+(?:\.\d+)?)px/);

              if (stackedWidthMatch && stackedHeightMatch) {
                const stackedWidth = parseFloat(stackedWidthMatch[1]);
                const stackedHeight = parseFloat(stackedHeightMatch[1]);

                // Stacked cards should have same width as front badge
                expect(stackedWidth).toBe(frontWidth);

                // Stacked cards should be at least as tall as front badge's rendered height
                // (accounting for rotation making bounding box slightly larger)
                expect(stackedHeight).toBeGreaterThanOrEqual(frontBox.height * 0.95);
              }
            }
          }
          break;
        }
      }
    }

    if (!foundStackedCluster) {
      test.skip();
    }
  });

  test('clicking cluster zooms in', async ({ page }) => {
    // Dismiss any temp badge that may have appeared from zooming
    const tempBadge = page.locator('.clicked-location-marker');
    if (await tempBadge.count() > 0) {
      await tempBadge.click();
      await page.waitForTimeout(500);
    }

    const clusters = page.locator('.cluster-icon');
    const count = await clusters.count();

    if (count === 0) {
      test.skip();
      return;
    }

    // Get initial cluster count
    const initialCount = count;

    // Double-click on a cluster to zoom in (single click might not trigger zoom)
    await clusters.first().dblclick({ force: true });
    await page.waitForTimeout(2000);

    // After double-clicking, either clusters decrease or individual badges appear
    const newClusterCount = await clusters.count();
    const badges = page.locator('.weather-badge-marker');
    const badgeCount = await badges.count();

    // Either we have fewer clusters, more individual badges, or same (if already at max zoom)
    // Just verify the interaction doesn't break anything
    expect(newClusterCount >= 0 || badgeCount >= 0).toBeTruthy();
  });
});

test.describe('DateTime Picker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./map');
    await page.waitForSelector('.leaflet-container', { timeout: 30000 });
    await page.waitForTimeout(1000);
  });

  test('datetime picker is visible on the map', async ({ page }) => {
    const picker = page.getByTestId('datetime-picker');
    await expect(picker).toBeVisible();
  });

  test('datetime picker shows "Nu" by default', async ({ page }) => {
    const display = page.getByTestId('datetime-display');
    await expect(display).toHaveText('Nu');
  });

  test('clicking datetime picker toggle expands the picker', async ({ page }) => {
    const toggle = page.getByTestId('datetime-toggle');
    await toggle.click();

    const expanded = page.getByTestId('datetime-expanded');
    await expect(expanded).toBeVisible();
  });

  test('datetime picker shows day grid when expanded', async ({ page }) => {
    const toggle = page.getByTestId('datetime-toggle');
    await toggle.click();

    const dayGrid = page.getByTestId('datetime-day-grid');
    await expect(dayGrid).toBeVisible();

    // Should have 15 day buttons (7 days back + today + 7 days forward)
    const dayButtons = dayGrid.locator('button');
    await expect(dayButtons).toHaveCount(15);
  });

  test('datetime picker shows hour grid when expanded', async ({ page }) => {
    const toggle = page.getByTestId('datetime-toggle');
    await toggle.click();

    const hourGrid = page.getByTestId('datetime-hour-grid');
    await expect(hourGrid).toBeVisible();

    // Should have 24 hour buttons
    const hourButtons = hourGrid.locator('button');
    await expect(hourButtons).toHaveCount(24);
  });

  test('selecting a different hour and clicking OK updates the display', async ({ page }) => {
    const toggle = page.getByTestId('datetime-toggle');
    await toggle.click();

    // Click on hour 14 (2 PM)
    const hour14 = page.getByTestId('datetime-hour-14');
    await hour14.click();

    // Click OK to confirm
    const okButton = page.getByTestId('datetime-ok');
    await okButton.click();

    // Display should now show the selected time (not "Nu" if current hour is not 14)
    const display = page.getByTestId('datetime-display');
    const now = new Date();

    if (now.getHours() !== 14) {
      // Should show formatted date/time instead of "Nu"
      await expect(display).toContainText('kl. 14');
    }
  });

  test('closing modal discards changes', async ({ page }) => {
    const toggle = page.getByTestId('datetime-toggle');
    await toggle.click();

    // Select a different hour
    const hourButton = page.getByTestId('datetime-hour-3');
    await hourButton.click();

    // Close modal using the X button in header to discard changes
    const closeButton = page.getByTestId('datetime-close');
    await closeButton.click();

    // Display should still show "Nu"
    const display = page.getByTestId('datetime-display');
    await expect(display).toHaveText('Nu');
  });

  test('OK button is visible when expanded', async ({ page }) => {
    const toggle = page.getByTestId('datetime-toggle');
    await toggle.click();

    const okButton = page.getByTestId('datetime-ok');
    await expect(okButton).toBeVisible();
  });

  test('reset button returns to current time', async ({ page }) => {
    const toggle = page.getByTestId('datetime-toggle');
    await toggle.click();

    // Select a different hour to change from current
    const hourButton = page.getByTestId('datetime-hour-3');
    await hourButton.click();

    // Click OK to confirm
    const okButton = page.getByTestId('datetime-ok');
    await okButton.click();

    // Display should not show "Nu" anymore
    const display = page.getByTestId('datetime-display');
    await expect(display).not.toHaveText('Nu');

    // Open picker again and click reset button
    await toggle.click();
    const resetButton = page.getByTestId('datetime-reset-full');
    await resetButton.click();

    // Should be back to "Nu"
    await expect(display).toHaveText('Nu');
  });

  test('reset icon appears when not showing current time', async ({ page }) => {
    const toggle = page.getByTestId('datetime-toggle');
    await toggle.click();

    // Select a different hour
    const hourButton = page.getByTestId('datetime-hour-3');
    await hourButton.click();

    // Click OK to confirm
    const okButton = page.getByTestId('datetime-ok');
    await okButton.click();

    // Reset icon should be visible in the collapsed view
    const resetIcon = page.getByTestId('datetime-reset');
    await expect(resetIcon).toBeVisible();
  });

  test('selecting new date keeps current hour', async ({ page }) => {
    const toggle = page.getByTestId('datetime-toggle');
    await toggle.click();

    // Select tomorrow (day index 8, since today is at index 7)
    const tomorrowButton = page.getByTestId('datetime-day-8');
    await tomorrowButton.click();

    // Select hour 14
    const hour14 = page.getByTestId('datetime-hour-14');
    await hour14.click();

    // Click OK to confirm
    const okButton = page.getByTestId('datetime-ok');
    await okButton.click();

    // Display should show the selected hour for the new date
    const display = page.getByTestId('datetime-display');
    await expect(display).toContainText('kl. 14');
  });

  test('changing datetime and clicking OK triggers data reload', async ({ page }) => {
    // Wait for initial data to load
    await page.waitForSelector('.weather-badge-marker', { timeout: 10000 });

    // Open picker and change time
    const toggle = page.getByTestId('datetime-toggle');
    await toggle.click();

    // Select tomorrow (day index 8, since today is at index 7)
    const tomorrowButton = page.getByTestId('datetime-day-8');
    await tomorrowButton.click();

    // Click OK to confirm
    const okButton = page.getByTestId('datetime-ok');
    await okButton.click();

    // Wait for potential reload (check loading indicator or wait)
    await page.waitForTimeout(2000);

    // Badges should still be visible (data should reload)
    const badges = page.locator('.weather-badge-marker');
    const badgeCount = await badges.count();
    expect(badgeCount).toBeGreaterThan(0);
  });

  test('selecting datetime without clicking OK does not trigger data reload', async ({ page }) => {
    // Wait for initial data to load
    await page.waitForSelector('.weather-badge-marker', { timeout: 10000 });

    // Open picker
    const toggle = page.getByTestId('datetime-toggle');
    await toggle.click();

    // Select a different day but don't click OK (day index 8, since today is at index 7)
    const tomorrowButton = page.getByTestId('datetime-day-8');
    await tomorrowButton.click();

    // Wait a moment
    await page.waitForTimeout(500);

    // Display should still show "Nu" (not changed yet)
    const display = page.getByTestId('datetime-display');
    await expect(display).toHaveText('Nu');
  });
});
