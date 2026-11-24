import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        pg=await b.new_page(viewport={'width':794,'height':1123}); await pg.goto('file:///home/claude/guide/guide.html'); await pg.wait_for_timeout(800)
        await pg.pdf(path='/home/claude/guide/Mode_emploi_application_SNETAA-FO_OT.pdf', format='A4', print_background=True, prefer_css_page_size=True)
        await b.close()
asyncio.run(main())
