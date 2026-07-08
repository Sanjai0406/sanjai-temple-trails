"""
Playwright test: toggling animation intensity to "Low" disables ambient
motion on Home and temple detail pages while preserving static content.

Run from project root (dev server on :8080 must be up):
    python3 tests/motion_low.spec.py
"""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
TEMPLE_SLUG = "brihadeeswarar-thanjavur"
SHOTS = Path("/tmp/browser/motion-low")
SHOTS.mkdir(parents=True, exist_ok=True)

FAIL: list[str] = []
def check(cond: bool, msg: str):
    print(("PASS" if cond else "FAIL"), "-", msg)
    if not cond: FAIL.append(msg)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()

        # --- Baseline: standard intensity ---
        await page.goto(BASE, wait_until="domcontentloaded")
        await page.wait_for_selector(".diya")
        diyas_std = await page.locator(".diya").count()
        marquee_std = await page.locator(".animate-marquee").count()
        html_class_std = await page.evaluate("document.documentElement.className")
        check(diyas_std > 0, f"Home renders floating diyas at standard ({diyas_std})")
        check(marquee_std > 0, "Home renders marquee tagline at standard")
        check("motion-low" not in html_class_std, "html lacks .motion-low at standard")
        await page.screenshot(path=str(SHOTS / "1_home_standard.png"))

        # --- Toggle to Low via the same localStorage key the app uses ---
        await page.evaluate("localStorage.setItem('motion-intensity','low')")
        await page.reload(wait_until="domcontentloaded")

        html_class_low = await page.evaluate("document.documentElement.className")
        check("motion-low" in html_class_low, "html gains .motion-low after toggle")

        # Diyas: element may still be in DOM but must be display:none under motion-low
        diya_display = await page.evaluate(
            "(() => { const d=document.querySelector('.diya');"
            "return d ? getComputedStyle(d).display : 'missing'; })()"
        )
        check(diya_display in ("none", "missing"), f"Diyas hidden under motion-low (display={diya_display})")

        # Marquee: animation must be disabled
        marquee_anim = await page.evaluate(
            "(() => { const m=document.querySelector('.animate-marquee');"
            "return m ? getComputedStyle(m).animationName : 'missing'; })()"
        )
        check(marquee_anim in ("none", "missing"), f"Marquee animation disabled (animationName={marquee_anim})")

        # Stagger children should be visible (opacity 1) quickly under motion-low
        await page.wait_for_selector(".stagger > *")
        stagger_opacity = await page.evaluate(
            "(() => { const e=document.querySelector('.stagger > *');"
            "return e ? getComputedStyle(e).opacity : 'missing'; })()"
        )
        check(stagger_opacity != "0", f"Stagger children rendered opaque (opacity={stagger_opacity})")
        await page.screenshot(path=str(SHOTS / "2_home_low.png"))

        # --- Temple detail: gold-glow CTA must not animate under motion-low ---
        await page.goto(f"{BASE}/temple/{TEMPLE_SLUG}", wait_until="domcontentloaded")
        await page.wait_for_function("document.documentElement.classList.contains('motion-low')")
        await page.wait_for_selector(".animate-gold-glow")
        glow = await page.evaluate(
            "(() => { const g=document.querySelector('.animate-gold-glow');"
            "return g ? { name: getComputedStyle(g).animationName, dur: getComputedStyle(g).animationDuration } : null; })()"
        )
        check(bool(glow) and (glow["name"] == "none" or glow["dur"] in ("0s", "0ms")),
              f"Gold-glow CTA animation disabled ({glow})")

        # hover:scale-* transforms must be neutralised on temple page images
        scale_transform = await page.evaluate("""(() => {
            const el = document.querySelector('[class*="hover:scale-"]');
            if (!el) return 'missing';
            el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            return getComputedStyle(el).transform;
        })()""")
        check(scale_transform in ("none", "matrix(1, 0, 0, 1, 0, 0)", "missing"),
              f"hover:scale-* neutralised under motion-low (transform={scale_transform})")
        await page.screenshot(path=str(SHOTS / "3_temple_low.png"))

        # --- Restore standard and verify diyas reappear ---
        await page.evaluate("localStorage.setItem('motion-intensity','standard')")
        await page.goto(BASE, wait_until="domcontentloaded")
        await page.wait_for_selector(".diya")
        diya_display_back = await page.evaluate(
            "getComputedStyle(document.querySelector('.diya')).display"
        )
        check(diya_display_back != "none", f"Diyas visible again after switching back (display={diya_display_back})")

        await browser.close()

    print("\n" + ("ALL PASSED" if not FAIL else f"{len(FAIL)} FAILED"))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
