"""Verify browser/anon client cannot read temple_photo_repairs."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

SCREENSHOTS = Path(__file__).parent / "screenshots" / "anon_repairs_blocked"
SCREENSHOTS.mkdir(parents=True, exist_ok=True)


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        await page.goto("http://localhost:8080", wait_until="domcontentloaded")

        # Probe the anon client from the running app's own supabase instance.
        result = await page.evaluate(
            """async () => {
              const mod = await import('/src/integrations/supabase/client.ts');
              const { data, error } = await mod.supabase
                .from('temple_photo_repairs')
                .select('*')
                .limit(1);
              return {
                data,
                error: error ? { message: error.message, code: error.code, status: error.status } : null,
              };
            }"""
        )
        print("anon select result:", json.dumps(result, indent=2))

        await page.screenshot(path=str(SCREENSHOTS / "home.png"))

        assert result["error"] is not None, (
            f"Expected anon client to be blocked from temple_photo_repairs, "
            f"but got data: {result['data']!r}"
        )
        msg = (result["error"].get("message") or "").lower()
        code = str(result["error"].get("code") or "")
        # RLS with no anon-visible policy => empty result set OR PostgREST 42501 / permission denied.
        assert (
            "permission denied" in msg
            or "row-level security" in msg
            or "not authorized" in msg
            or code in ("42501", "PGRST301", "PGRST116")
        ), f"Unexpected error shape: {result['error']}"

        # Also verify empty-array is not returned as success (belt & suspenders).
        assert not result["data"], f"anon should not receive rows, got {result['data']!r}"

        print("PASS: anon client blocked from temple_photo_repairs")
        await browser.close()


asyncio.run(main())
