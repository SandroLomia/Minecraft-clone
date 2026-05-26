import asyncio
from playwright.sync_api import sync_playwright
import time
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        # Start server in background if not already running
        # Assuming it's already running from previous step, but let's be safe
        page.goto("http://localhost:8000")
        time.sleep(2) # Wait for load

        # Sunrise
        page.evaluate("window.gameTime = 5500")
        time.sleep(1)
        page.screenshot(path="sunrise_verification.png")
        print("Captured sunrise_verification.png")

        # Full Day
        page.evaluate("window.gameTime = 12000")
        time.sleep(1)
        page.screenshot(path="day_verification.png")
        print("Captured day_verification.png")

        browser.close()

if __name__ == "__main__":
    run()
