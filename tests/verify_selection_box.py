from playwright.sync_api import sync_playwright
import time
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--no-sandbox', '--disable-setuid-sandbox'])
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Start local server
        import subprocess
        server = subprocess.Popen(['python3', '-m', 'http.server', '8000'])
        time.sleep(2)  # Wait for server to start

        try:
            page.goto('http://localhost:8000')
            time.sleep(2)

            # Click to start (locks pointer)
            page.click('#overlay')
            time.sleep(1)

            # Move mouse slightly to ensure raycast hits something
            page.mouse.move(640, 360)
            time.sleep(1)

            page.screenshot(path='selection_box_verification.png')
            print("Screenshot saved to selection_box_verification.png")

        finally:
            server.terminate()
            browser.close()

if __name__ == '__main__':
    run()
