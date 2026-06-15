import time
import subprocess
import os
from playwright.sync_api import sync_playwright

def run_verification():
    # Start a local server
    server_process = subprocess.Popen(['python3', '-m', 'http.server', '8000'])
    time.sleep(2)  # Give the server time to start

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.goto('http://localhost:8000')

            # Wait for the game to load
            page.wait_for_selector('#overlay')
            print("Game loaded successfully.")

            # Click to play
            page.click('#overlay')
            time.sleep(1)

            # Take a screenshot to verify graphics
            page.screenshot(path='tests/game_screenshot.png')
            print("Screenshot taken: tests/game_screenshot.png")

            # Basic checks
            assert page.is_visible('#ui-container')
            assert page.is_visible('#inventory')

            # Check if all blocks are in inventory
            slots = page.query_selector_all('.inventory-slot')
            print(f"Inventory slots found: {len(slots)}")
            assert len(slots) == 9

            print("Verification passed!")

    finally:
        server_process.terminate()

if __name__ == "__main__":
    run_verification()
