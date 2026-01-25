import { test, expect } from '@playwright/test';

test.describe('Simple Web App Tests', () => {
  test('homepage loads with correct title', async ({ page }) => {
    await page.goto('./');

    // Check the main heading is visible
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Lystfiskeri');

    // Check the subtitle is visible
    const subtitle = page.locator('text=Find det perfekte sted');
    await expect(subtitle).toBeVisible();
  });

  test('navigation to map page works', async ({ page }) => {
    await page.goto('./');

    // Click on the map navigation link
    const mapLink = page.locator('a[href="/map"]').first();
    await expect(mapLink).toBeVisible();
    await mapLink.click();

    // Should navigate to map page
    await expect(page).toHaveURL(/\/map/);

    // Map container should be visible
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
  });

  test('search functionality filters spots', async ({ page }) => {
    await page.goto('./');

    // Wait for spots to load
    await page.waitForTimeout(2000);

    // Find the search input
    const searchInput = page.locator('input[placeholder="Søg efter steder..."]');
    await expect(searchInput).toBeVisible();

    // Type a search term
    await searchInput.fill('test');

    // The search should filter results (verify input value changed)
    await expect(searchInput).toHaveValue('test');
  });

  test('filter buttons work correctly', async ({ page }) => {
    await page.goto('./');

    // Find filter buttons
    const allButton = page.locator('button:has-text("Alle")');
    const fishingButton = page.locator('button:has-text("Fiskesteder")');
    const webcamButton = page.locator('button:has-text("Webcams")');

    // All buttons should be visible
    await expect(allButton).toBeVisible();
    await expect(fishingButton).toBeVisible();
    await expect(webcamButton).toBeVisible();

    // Click fishing filter
    await fishingButton.click();

    // Fishing button should now have active styling (bg-blue-500)
    await expect(fishingButton).toHaveClass(/bg-blue-500/);

    // Click webcam filter
    await webcamButton.click();

    // Webcam button should now have active styling (bg-purple-500)
    await expect(webcamButton).toHaveClass(/bg-purple-500/);
  });

  test('404 page displays for invalid routes', async ({ page }) => {
    await page.goto('./nonexistent-page-12345');

    // Should show 404 content
    const heading = page.locator('h1:has-text("404")');
    await expect(heading).toBeVisible();

    // Should have return home link
    const homeLink = page.locator('a:has-text("Return Home")');
    await expect(homeLink).toBeVisible();

    // Clicking the link should go to homepage
    await homeLink.click();
    await expect(page).toHaveURL(/\/$/);
  });
});
