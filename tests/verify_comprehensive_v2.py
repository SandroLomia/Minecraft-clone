import time
import os
from playwright.sync_api import sync_playwright

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Enable console log capture
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))

        # Start a local server
        import subprocess
        server = subprocess.Popen(['python3', '-m', 'http.server', '8000'])
        time.sleep(2) # Wait for server to start

        try:
            page.goto("http://localhost:8000")
            page.wait_for_load_state("networkidle")

            # 1. Verify Inventory
            inventory_count = page.evaluate("() => document.querySelectorAll('.inventory-slot').length")
            print(f"Inventory size: {inventory_count}")
            page.screenshot(path="verification_1_initial.png")

            # 2. Break a block to see particles and selection box
            # Point camera down slightly to see the ground
            print("Looking down...")
            page.mouse.move(640, 360)
            page.mouse.down()
            page.mouse.move(640, 600) # Look further down
            page.mouse.up()
            time.sleep(0.5)

            print("Capturing selection box...")
            page.screenshot(path="verification_1_selection.png")

            print("Breaking block...")
            page.mouse.click(640, 360, button="left") # Click center (crosshair)
            time.sleep(0.05) # Very brief pause to capture particles mid-air
            page.screenshot(path="verification_2_particles.png")

            # 3. Sprinting
            print("Sprinting...")
            page.keyboard.down("Shift")
            page.keyboard.down("w")
            time.sleep(1)
            page.keyboard.up("w")
            page.keyboard.up("Shift")

            # 4. Day/Night Cycle
            # Speed up time for testing
            page.evaluate("() => { window.gameTime = 0; }")
            print("Noon...")
            page.evaluate("() => { window.gameTime = 12000; }")
            time.sleep(0.5)
            page.screenshot(path="verification_3_noon.png")

            print("Sunset...")
            page.evaluate("() => { window.gameTime = 17500; }")
            time.sleep(0.5)
            page.screenshot(path="verification_4_sunset.png")

            print("Night...")
            page.evaluate("() => { window.gameTime = 22000; }")
            time.sleep(0.5)
            page.screenshot(path="verification_5_night.png")

        finally:
            server.terminate()
            browser.close()

if __name__ == "__main__":
    run_verification()
