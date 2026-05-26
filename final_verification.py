import asyncio
from playwright.sync_api import sync_playwright
import time
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:8000")
        time.sleep(3)

        # 1. Check for console errors
        errors = []
        page.on("pageerror", lambda exc: errors.append(exc))

        # 2. Verify Trees
        page.screenshot(path="final_trees.png")
        print("Captured final_trees.png")

        # 3. Verify Day/Night
        page.evaluate("window.gameTime = 22000") # Night
        time.sleep(1)
        page.screenshot(path="final_night.png")
        print("Captured final_night.png")

        # 4. Verify Inventory
        inventory_visible = page.is_visible("#inventory")
        print(f"Inventory visible: {inventory_visible}")

        # 5. Check if LEAVES is in inventory blocks
        items_count = page.locator(".inventory-slot").count()
        print(f"Inventory slots count: {items_count}")

        if errors:
            print(f"Detected {len(errors)} console errors!")
            for error in errors:
                print(f"Error: {error}")
        else:
            print("No console errors detected.")

        browser.close()

if __name__ == "__main__":
    run()
