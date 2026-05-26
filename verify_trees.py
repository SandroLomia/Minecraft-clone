import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        try:
            import subprocess
            server = subprocess.Popen(["python3", "-m", "http.server", "8002"])
            await asyncio.sleep(2)

            await page.goto("http://localhost:8002")
            await asyncio.sleep(2) # Wait for chunks to generate

            # Check if any wood/leaves blocks exist in any chunk
            # We can't easily inspect internal memory, but we can check if it rendered anything
            # Better way: Take a screenshot
            await page.screenshot(path="trees_verification.png")
            print("Screenshot taken: trees_verification.png")

        finally:
            server.terminate()
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
