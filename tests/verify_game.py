
import asyncio
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto('http://localhost:8000')

        # Wait for game to initialize
        page.wait_for_timeout(2000)

        # Take a screenshot at day (default)
        page.screenshot(path='screenshot_day.png')

        # Go to night (timeRatio = 0 or 1, let's use 0)
        page.evaluate("window.gameTime = 0")
        page.wait_for_timeout(500) # Wait for environment to update
        page.screenshot(path='screenshot_night.png')

        # Go to dusk (around 18000, timeRatio = 0.75)
        page.evaluate("window.gameTime = 18000")
        page.wait_for_timeout(500)
        page.screenshot(path='screenshot_dusk.png')

        browser.close()

if __name__ == "__main__":
    run()
