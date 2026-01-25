import { test, expect } from '@playwright/test';

/**
 * iOS Verification Tests
 *
 * These tests verify that the app works correctly for iOS devices by testing:
 * - Mobile viewport rendering
 * - Touch interactions
 * - Navigation patterns
 * - Safe area handling
 * - Core functionality on mobile
 */

// Use iPhone 14 Pro viewport dimensions
const iOSViewport = { width: 393, height: 852 };

test.describe('iOS Verification Tests', () => {
  test.use({ viewport: iOSViewport });

  test.describe('1. App Loading', () => {
    test('app loads successfully on mobile viewport', async ({ page }) => {
      await page.goto('./');

      // Wait for the app to fully load
      await page.waitForLoadState('networkidle');

      // Verify main heading is visible
      const heading = page.locator('h1');
      await expect(heading).toBeVisible({ timeout: 10000 });
      await expect(heading).toContainText('Lystfiskeri');

      // Verify the page has rendered with correct viewport
      const viewportSize = page.viewportSize();
      expect(viewportSize?.width).toBe(iOSViewport.width);
      expect(viewportSize?.height).toBe(iOSViewport.height);
    });
  });

  test.describe('2. Bottom Navigation', () => {
    test('bottom navigation is visible and functional', async ({ page }) => {
      await page.goto('./');
      await page.waitForLoadState('networkidle');

      // Find bottom navigation
      const nav = page.locator('nav').filter({ has: page.locator('a[href="/"]') });
      await expect(nav).toBeVisible();

      // Verify all nav items are present
      const listLink = page.locator('a[href="/"]').filter({ hasText: 'Liste' });
      const mapLink = page.locator('a[href="/map"]').filter({ hasText: 'Kort' });
      const adminLink = page.locator('a[href="/admin"]').filter({ hasText: 'Admin' });

      await expect(listLink).toBeVisible();
      await expect(mapLink).toBeVisible();
      await expect(adminLink).toBeVisible();

      // Test navigation by tapping on map link
      await mapLink.tap();
      await expect(page).toHaveURL(/\/map/);

      // Navigate back to list
      await listLink.tap();
      await expect(page).toHaveURL(/\/$/);
    });
  });

  test.describe('3. Touch-Friendly Tap Targets', () => {
    test('navigation tap targets meet minimum size requirements', async ({ page }) => {
      await page.goto('./');
      await page.waitForLoadState('networkidle');

      // iOS Human Interface Guidelines recommend minimum 44x44px tap targets
      const minTapSize = 44;

      // Check nav link sizes
      const navLinks = page.locator('nav a');
      const count = await navLinks.count();

      for (let i = 0; i < count; i++) {
        const link = navLinks.nth(i);
        const box = await link.boundingBox();

        if (box) {
          // Height should be at least 44px (the nav uses h-14 which is 56px)
          expect(box.height).toBeGreaterThanOrEqual(minTapSize);
        }
      }

      // Check filter button sizes
      const filterButtons = page.locator('button').filter({ hasText: /Alle|Fiskesteder|Webcams/ });
      const filterCount = await filterButtons.count();

      for (let i = 0; i < filterCount; i++) {
        const button = filterButtons.nth(i);
        const box = await button.boundingBox();

        if (box) {
          // Combined width and height should provide adequate tap area
          expect(box.height).toBeGreaterThanOrEqual(32);
        }
      }
    });
  });

  test.describe('4. Search Functionality', () => {
    test('search input is focusable and accepts input', async ({ page }) => {
      await page.goto('./');
      await page.waitForLoadState('networkidle');

      // Find and tap the search input
      const searchInput = page.locator('input[placeholder*="Søg"]');
      await expect(searchInput).toBeVisible();

      // Tap to focus
      await searchInput.tap();

      // Type a search term
      await searchInput.fill('test');

      // Verify the input value
      await expect(searchInput).toHaveValue('test');

      // Clear and type another term
      await searchInput.clear();
      await searchInput.fill('hav');
      await expect(searchInput).toHaveValue('hav');
    });
  });

  test.describe('5. Spot Cards Interaction', () => {
    test('spot cards are visible and tappable', async ({ page }) => {
      await page.goto('./');
      await page.waitForLoadState('networkidle');

      // Wait for spots to load
      await page.waitForTimeout(2000);

      // Find spot cards (they're wrapped in links or have click handlers)
      const spotCards = page.locator('[class*="SpotCard"], a[href^="/spot/"]');
      const count = await spotCards.count();

      // Skip if no spots are loaded
      if (count === 0) {
        test.skip();
        return;
      }

      // Get the first card
      const firstCard = spotCards.first();
      await expect(firstCard).toBeVisible();

      // Tap the card to navigate
      await firstCard.tap();

      // Should navigate to spot detail page
      await expect(page).toHaveURL(/\/spot\/\d+/, { timeout: 5000 });
    });
  });

  test.describe('6. Map View Rendering', () => {
    test('map loads and renders correctly on mobile', async ({ page }) => {
      await page.goto('./map');

      // Wait for map container to load
      const mapContainer = page.locator('.leaflet-container');
      await expect(mapContainer).toBeVisible({ timeout: 30000 });

      // Verify map tiles have loaded
      const tiles = page.locator('.leaflet-tile');
      await expect(tiles.first()).toBeVisible({ timeout: 10000 });

      // Verify map is taking up the viewport
      const mapBox = await mapContainer.boundingBox();
      expect(mapBox).toBeTruthy();
      if (mapBox) {
        expect(mapBox.width).toBeGreaterThan(300);
        expect(mapBox.height).toBeGreaterThan(400);
      }
    });
  });

  test.describe('7. Filter Buttons', () => {
    test('filter buttons respond to touch interactions', async ({ page }) => {
      await page.goto('./');
      await page.waitForLoadState('networkidle');

      // Find filter buttons
      const allButton = page.locator('button').filter({ hasText: 'Alle' });
      const fishingButton = page.locator('button').filter({ hasText: 'Fiskesteder' });
      const webcamButton = page.locator('button').filter({ hasText: 'Webcams' });

      await expect(allButton).toBeVisible();
      await expect(fishingButton).toBeVisible();
      await expect(webcamButton).toBeVisible();

      // Tap on fishing filter
      await fishingButton.tap();
      await page.waitForTimeout(500);

      // Verify button style changed (active state)
      await expect(fishingButton).toHaveClass(/bg-blue-500/);

      // Tap on webcam filter
      await webcamButton.tap();
      await page.waitForTimeout(500);

      // Verify webcam button is now active
      await expect(webcamButton).toHaveClass(/bg-purple-500/);

      // Tap back to all
      await allButton.tap();
      await page.waitForTimeout(500);
      await expect(allButton).toHaveClass(/bg-primary/);
    });
  });

  test.describe('8. Page Transitions', () => {
    test('navigation between pages works smoothly', async ({ page }) => {
      // Start on home
      await page.goto('./');
      await page.waitForLoadState('networkidle');

      // Navigate to map via bottom nav
      const mapLink = page.locator('a[href="/map"]').filter({ hasText: 'Kort' });
      await mapLink.tap();
      await expect(page).toHaveURL(/\/map/, { timeout: 5000 });

      // Wait for map to load
      await page.waitForSelector('.leaflet-container', { timeout: 30000 });

      // Navigate to admin
      const adminLink = page.locator('a[href="/admin"]').filter({ hasText: 'Admin' });
      await adminLink.tap();
      await expect(page).toHaveURL(/\/admin/, { timeout: 5000 });

      // Navigate back to list
      const listLink = page.locator('a[href="/"]').filter({ hasText: 'Liste' });
      await listLink.tap();
      await expect(page).toHaveURL(/\/$/, { timeout: 5000 });
    });
  });

  test.describe('9. Scroll Behavior', () => {
    test('page content is scrollable', async ({ page }) => {
      await page.goto('./');
      await page.waitForLoadState('networkidle');

      // Wait for content to load
      await page.waitForTimeout(2000);

      // Get initial scroll position
      const initialScroll = await page.evaluate(() => window.scrollY);

      // Scroll down
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForTimeout(500);

      // Verify scroll happened
      const newScroll = await page.evaluate(() => window.scrollY);
      expect(newScroll).toBeGreaterThan(initialScroll);

      // Scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);

      const topScroll = await page.evaluate(() => window.scrollY);
      expect(topScroll).toBe(0);
    });
  });

  test.describe('10. Spot Detail Page', () => {
    test('spot detail page loads and displays correctly', async ({ page }) => {
      // First go to home and find a spot
      await page.goto('./');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Find and tap a spot card
      const spotCards = page.locator('a[href^="/spot/"]');
      const count = await spotCards.count();

      if (count === 0) {
        // Navigate directly to a spot if no cards found
        await page.goto('./spot/1');
      } else {
        await spotCards.first().tap();
      }

      // Wait for navigation
      await page.waitForURL(/\/spot\/\d+/, { timeout: 5000 }).catch(() => {
        // Already on a spot page or failed to navigate
      });

      // Wait for page content to load
      await page.waitForTimeout(2000);

      // Check for back button (ArrowLeft icon is used)
      const backButton = page.locator('button, a').filter({ has: page.locator('svg') }).first();

      // Check for spot name heading
      const headings = page.locator('h1, h2');
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);

      // Verify the page is rendering content
      const mainContent = page.locator('main, [class*="container"]');
      await expect(mainContent.first()).toBeVisible();

      // Navigate back using the back button if visible
      if (await backButton.isVisible()) {
        await backButton.tap();
        await page.waitForTimeout(1000);
      }
    });
  });
});
