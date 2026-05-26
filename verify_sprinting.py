import asyncio
from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:8000")
        time.sleep(2)

        # Move without sprinting
        page.keyboard.down('KeyW')
        time.sleep(1)
        pos1 = page.evaluate("({x: camera.position.x, z: camera.position.z})")
        time.sleep(1)
        pos2 = page.evaluate("({x: camera.position.x, z: camera.position.z})")
        page.keyboard.up('KeyW')

        dist_normal = ((pos2['x'] - pos1['x'])**2 + (pos2['z'] - pos1['z'])**2)**0.5
        print(f"Distance normal: {dist_normal}")

        # Reset position if possible or just continue
        # Move with sprinting
        page.keyboard.down('ShiftLeft')
        page.keyboard.down('KeyW')
        time.sleep(1)
        pos3 = page.evaluate("({x: camera.position.x, z: camera.position.z})")
        time.sleep(1)
        pos4 = page.evaluate("({x: camera.position.x, z: camera.position.z})")
        page.keyboard.up('KeyW')
        page.keyboard.up('ShiftLeft')

        dist_sprint = ((pos4['x'] - pos3['x'])**2 + (pos4['z'] - pos3['z'])**2)**0.5
        print(f"Distance sprint: {dist_sprint}")

        if dist_sprint > dist_normal * 1.5:
            print("Sprinting verified!")
        else:
            print("Sprinting verification FAILED!")

        browser.close()

if __name__ == "__main__":
    run()
