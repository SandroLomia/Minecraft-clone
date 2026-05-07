import { test, expect } from '@playwright/test';

test('verify game features', async ({ page }) => {
    // Navigate to the local server
    await page.goto('http://localhost:8080');

    // Wait for the overlay to be visible
    await page.waitForSelector('#overlay');

    // Click the overlay to start the game
    await page.click('#overlay');

    // Wait for the game container to be populated
    await page.waitForSelector('canvas');

    // Wait a bit for the game to run
    await page.waitForTimeout(5000);

    // Take a screenshot to visually verify trees and the selection box
    await page.screenshot({ path: 'screenshots/gameplay.png' });

    // Verify inventory slots
    const inventorySlots = await page.locator('.inventory-slot').count();
    expect(inventorySlots).toBe(7); // GRASS, DIRT, STONE, WOOD, SAND, GLASS, LEAVES
});
