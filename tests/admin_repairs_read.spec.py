"""Positive-path guard: the admin/server-backed read of `temple_photo_repairs`
must keep working and return correct row counts.

Pairs with anon_repairs_regression.spec.py (which asserts anon is blocked).
This one drives the app's own server functions from the browser:
  1. reads the current log total for a temple,
  2. triggers a repair (which writes exactly one log row),
  3. re-reads and asserts total incremented by 1 and the newest row is the
     one just written, with the fields the UI depends on.
"""
import asyncio
import json
from pathlib import Path

from playwright.async_api import async_playwright

SLUG = "agumbe"
SCREENSHOTS = Path(__file__).parent / "screenshots" / "admin_repairs_read"
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

CALL = """async ({ slug, fn, args }) => {
  const mod = await import('/src/lib/temple-photo.functions.ts');
  try {
    const data = await mod[fn]({ data: { slug, ...args } });
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
}"""


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        await page.goto("http://localhost:8080", wait_until="domcontentloaded")

        before = await page.evaluate(CALL, {"slug": SLUG, "fn": "listTemplePhotoRepairs", "args": {"limit": 10}})
        print("before:", json.dumps(before)[:400])
        assert before["ok"], f"admin-backed read failed: {before.get('error')}"
        assert isinstance(before["data"]["logs"], list)
        assert isinstance(before["data"]["total"], int)
        total_before = before["data"]["total"]

        repair = await page.evaluate(CALL, {"slug": SLUG, "fn": "repairTemplePhoto", "args": {"triggered_by": "manual"}})
        print("repair:", json.dumps(repair)[:300])

        after = await page.evaluate(CALL, {"slug": SLUG, "fn": "listTemplePhotoRepairs", "args": {"limit": 10}})
        print("after:", json.dumps(after)[:600])
        assert after["ok"], f"admin-backed read failed after repair: {after.get('error')}"

        logs = after["data"]["logs"]
        total_after = after["data"]["total"]

        assert total_after == total_before + 1, (
            f"expected total {total_before + 1} after one repair attempt, got {total_after}"
        )
        assert len(logs) == min(total_after, 10), f"returned {len(logs)} rows for total {total_after}"

        newest = logs[0]
        for field in ("id", "created_at", "source", "success", "triggered_by"):
            assert field in newest, f"missing field {field} in log row: {newest}"
        assert newest["triggered_by"] == "manual", newest
        assert newest["success"] is repair["ok"], (
            f"log success={newest['success']} disagrees with repair outcome {repair['ok']}"
        )
        if repair["ok"]:
            assert newest["photo_uri"], "successful repair should record a photo_uri"
        else:
            assert newest["error_message"], "failed repair should record an error_message"

        # Ordering is newest-first.
        stamps = [r["created_at"] for r in logs]
        assert stamps == sorted(stamps, reverse=True), f"logs not ordered newest-first: {stamps}"

        # The UI surface renders the same data.
        await page.goto(f"http://localhost:8080/temple/{SLUG}", wait_until="domcontentloaded")
        await page.get_by_text("Photo repair log").first.wait_for(timeout=15000)
        await page.wait_for_timeout(1500)
        panel = await page.locator("text=Photo repair log").first.evaluate(
            "el => el.closest('div.temple-card').innerText"
        )
        print("panel text:\n", panel)
        assert f"{total_after} total" in panel, f"panel does not show total {total_after}:\n{panel}"

        await page.screenshot(path=str(SCREENSHOTS / "temple_detail.png"))
        print(f"\nPASS: admin-backed repair log readable; total {total_before} -> {total_after}")
        await browser.close()


asyncio.run(main())
