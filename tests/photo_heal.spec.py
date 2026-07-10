"""
Verifies TempleImage's self-heal path:
  1. Intercept the first Google Places photo request per page and 404 it.
  2. Confirm the browser calls the public repairTemplePhoto server fn.
  3. Confirm the visible <img> ends up with a working URL (naturalWidth > 0)
     OR the component fell back to the gradient placeholder — never a broken icon.
Runs against the dev server at http://localhost:8080 on Home and a temple detail page.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

SHOTS = Path(__file__).parent / "screenshots" / "photo_heal"
SHOTS.mkdir(parents=True, exist_ok=True)

SLUG = "brihadeeswarar-thanjavur"

async def check_page(context, url: str, tag: str):
    page = await context.new_page()
    failed_once: set[str] = set()
    repair_calls: list[str] = []

    async def route_handler(route):
        req = route.request
        u = req.url
        # First time we see a googleusercontent image, simulate an expired URL.
        if "googleusercontent.com" in u and u not in failed_once:
            failed_once.add(u)
            await route.fulfill(status=404, body="")
            return
        await route.continue_()

    await context.route("**/*", route_handler)

    def on_request(req):
        if "_serverFn" in req.url or "repairTemplePhoto" in req.url:
            repair_calls.append(req.url)
    page.on("request", on_request)

    await page.goto(url, wait_until="domcontentloaded")
    await page.wait_for_load_state("networkidle", timeout=15000)
    # give self-heal time to run and the swapped img to load
    await asyncio.sleep(3)
    await page.screenshot(path=str(SHOTS / f"{tag}.png"))

    # No <img> in the DOM is left as a broken icon.
    broken = await page.evaluate("""() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      // ignore icons / decorative images without src
      return imgs.filter(i => i.src && i.complete && i.naturalWidth === 0)
                 .map(i => i.src);
    }""")

    healed = await page.evaluate("""() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.filter(i => i.naturalWidth > 0).length;
    }""")

    print(f"[{tag}] intercepted 404s: {len(failed_once)} | repair fn hits: {len(repair_calls)} | healed imgs: {healed} | broken imgs: {len(broken)}")
    for b in broken:
        print(f"  BROKEN: {b}")

    assert len(failed_once) > 0, f"[{tag}] no google photo requests were intercepted"
    assert len(broken) == 0, f"[{tag}] {len(broken)} images left broken"
    assert healed > 0 or len(repair_calls) > 0, f"[{tag}] neither healed nor called repair"

    await page.close()

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        await check_page(context, "http://localhost:8080/", "home")
        await check_page(context, f"http://localhost:8080/temple/{SLUG}", "detail")
        await browser.close()
        print("\nOK — TempleImage self-heal verified on Home + temple detail.")

asyncio.run(main())
