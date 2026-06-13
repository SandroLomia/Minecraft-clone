import subprocess
import time
from playwright.sync_api import sync_playwright

def run_test():
    # Start local server
    server = subprocess.Popen(['python3', '-m', 'http.server', '8081'])
    time.sleep(2)  # Wait for server to start

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.goto('http://localhost:8081')

            # Wait for game to load
            time.sleep(3)

            # Check if inventory has the new blocks
            # We have 9 blocks now
            slots = page.query_selector_all('.inventory-slot')
            print(f"Found {len(slots)} inventory slots")

            # Take a screenshot to see the new inventory and trees/terrain
            page.screenshot(path='new_blocks_verification.png')

            browser.close()
    finally:
        server.terminate()

if __name__ == '__main__':
    run_test()
