import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        try:
            import subprocess
            server = subprocess.Popen(["python3", "-m", "http.server", "8003"])
            await asyncio.sleep(2)

            await page.goto("http://localhost:8003")
            await asyncio.sleep(2)

            # Accelerate time to night
            await page.evaluate("window.gameTime = 0") # Midnight
            await asyncio.sleep(1)
            await page.screenshot(path="night_verification.png")
            print("Screenshot taken: night_verification.png")

            # Accelerate time to sunset
            await page.evaluate("window.gameTime = 18000") # Sunset (0.75 * 24000)
            await asyncio.sleep(1)
            await page.screenshot(path="sunset_verification.png")
            print("Screenshot taken: sunset_verification.png")

        finally:
            server.terminate()
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
