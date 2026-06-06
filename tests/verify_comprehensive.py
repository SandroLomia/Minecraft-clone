import time
import subprocess
from playwright.sync_api import sync_playwright

def verify_game():
    # Start a local server
    server_process = subprocess.Popen(['python3', '-m', 'http.server', '8081'])
    time.sleep(2)  # Wait for server to start

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.goto('http://localhost:8081')

            # Click overlay to start (though for automated screenshot it might not be necessary)
            page.click('#overlay')

            # Wait for some chunks to generate and game loop to run
            time.sleep(5)

            # Take a screenshot
            page.screenshot(path='screenshot.png')
            print("Screenshot saved to screenshot.png")

            # Check for console errors
            # (In a real test we'd listen for 'console' events)

            browser.close()
    finally:
        server_process.terminate()

if __name__ == '__main__':
    verify_game()
