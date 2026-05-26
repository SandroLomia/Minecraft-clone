import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        errors = []
        page.on("pageerror", lambda exc: errors.append(exc))
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)

        try:
            # Start a local server in the background
            import subprocess
            server = subprocess.Popen(["python3", "-m", "http.server", "8001"])
            await asyncio.sleep(2)

            await page.goto("http://localhost:8001", wait_until="networkidle")

            if errors:
                print("Found errors:")
                for error in errors:
                    print(error)
                exit(1)
            else:
                print("No errors found.")
        finally:
            server.terminate()
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
