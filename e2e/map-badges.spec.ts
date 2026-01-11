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

    // Click second badge (use force to bypass header if overlapping)
    await badges.nth(1).locator('div[style*="background: white"]').first().click({ force: true });
    await page.waitForTimeout(500);

    // Should still have one expanded badge (the second one now)
    expandedBadges = page.locator('.expanded-badge-marker');
    await expect(expandedBadges).toHaveCount(1);
  });
});

test.describe('Cluster Stacked Badges', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5000/map');
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
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

    // Should have anchor dot (blue circle at bottom)
    const anchorDot = cluster.locator('div[style*="border-radius: 50%"][style*="background: #3b82f6"]');
    await expect(anchorDot).toBeVisible();

    // Should have stem (white vertical line)
    const stem = cluster.locator('div[style*="width: 2px"][style*="background: white"]');
    await expect(stem).toBeVisible();

    // Should have front badge (white background)
    const frontBadge = cluster.locator('div[style*="background: white"][style*="border-radius: 6px"]');
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
    const tempText = cluster.locator('span[style*="font-weight: 700"]').first();
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

  test('stacked badges have same size as front badge', async ({ page }) => {
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
        // Get front badge (white background, no rotation)
        const frontBadge = cluster.locator('div[style*="background: white"][style*="border-radius"]').first();
        const frontBox = await frontBadge.boundingBox();

        if (!frontBox) continue;

        // Get stacked cards (have rotation transform)
        const stackedCards = cluster.locator('div[style*="rotate"]');
        const stackedCount = await stackedCards.count();

        if (stackedCount > 0) {
          foundStackedCluster = true;

          for (let j = 0; j < stackedCount; j++) {
            const stackedCard = stackedCards.nth(j);
            const stackedBox = await stackedCard.boundingBox();

            if (stackedBox) {
              // Stacked cards should be similar size to front badge (within 20% tolerance)
              // This catches the bug where stacked cards were too small due to mismatched hidden content
              const heightRatio = stackedBox.height / frontBox.height;
              const widthRatio = stackedBox.width / frontBox.width;

              expect(heightRatio).toBeGreaterThan(0.8);
              expect(heightRatio).toBeLessThan(1.2);
              expect(widthRatio).toBeGreaterThan(0.8);
              expect(widthRatio).toBeLessThan(1.2);
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

    // Click on a cluster (force to bypass any overlapping elements)
    await clusters.first().click({ force: true });
    await page.waitForTimeout(1000);

    // After clicking, either clusters decrease or individual badges appear
    const newClusterCount = await clusters.count();
    const badges = page.locator('.weather-badge-marker');
    const badgeCount = await badges.count();

    // Either we have fewer clusters or more individual badges visible
    expect(newClusterCount < initialCount || badgeCount > 0).toBeTruthy();
  });
});
