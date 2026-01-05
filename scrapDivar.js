import puppeteer from "puppeteer";
import fs from "fs";
import { title } from "process";


// const takeScreenshot = async () => {
//     try {
//         const browser = await puppeteer.launch({
//             executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
//             headless: false
//         })
//         const page = await browser.newPage()

//         await page.setViewport({
//             width: 1920,
//             height: 1080
//         })
//         await page.goto('https://divar.ir/s/mashhad', {
//             waitUntil: 'networkidle0'
//         })
//         await page.screenshot({
//             path: `${+new Date()}.png`,
//             fullPage: true,

//         })
//         await browser.close()

//     } catch (error) {
//         console.log(error);

//     }

// }
// takeScreenshot()


const parsePrice = (text) => {
    if (!text) return null;

    // اعداد فارسی و معادل انگلیسی
    const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
    const englishDigits = "0123456789";

    let normalized = text;

    // تبدیل اعداد فارسی به انگلیسی
    for (let i = 0; i < 10; i++) {
        normalized = normalized.replaceAll(persianDigits[i], englishDigits[i]);
    }

    // حذف هر چیزی غیر از عدد (ویرگول، تومان، فاصله و ...)
    normalized = normalized.replace(/[^\d]/g, "");

    // تبدیل به Number
    return Number(normalized);
};







const scrapDivar = async () => {
    const browser = await puppeteer.launch({
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        headless: true,
        defaultViewport: null
    })
    const page = await browser.newPage()

    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    )

    const url =
        "https://divar.ir/s/mashhad/real-estate/ostad-yousefi?districts=488%2C&map_bbox=59.2747802734375%2C36.184574127197266%2C60.11582946777344%2C36.975833892822266&map_place_hash=3%7C%7Creal-estate&recent_ads=3h"
    await page.goto(url, {
        waitUntil: "networkidle2"
    })

    await page.waitForSelector("a.kt-post-card__action");

    let previousHeight;
    while (true) {
        previousHeight = await page.evaluate("document.body.scrollHeight");
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
        await new Promise(r => setTimeout(r, 2000));
        const newHeight = await page.evaluate("document.body.scrollHeight");
        if (newHeight === previousHeight) break;
    }


    const rawItems = await page.$$eval(
        "a.kt-post-card__action",
        (cards) => {
            return cards.map((card) => {
                const title =
                    card.querySelector(".kt-post-card__title")?.innerText || null;

                const priceText =
                    card.querySelector(".kt-post-card__description")?.innerText || null;

                const location =
                    card.querySelector(".kt-post-card__bottom-description")?.innerText || null;

                const url = card.href || null;

                return {
                    title,
                    priceText,
                    location,
                    url
                };
            });
        }
    );

    const items = rawItems.map((item) => ({
        title: item.title,
        price: { value: parsePrice(item.priceText), unit: "TOMAN" },
        location: item.location,
        url: item.url

    }))
    const scrapedAt = new Date().toISOString();


    const output = {
        source: "divar.ir",
        city: "mashhad",
        filter: "recent_ads=3h",
        scraped_at: scrapedAt,
        count: items.length,
        items
    };

    fs.writeFileSync(
        "divar_real_estate_3h.json",
        JSON.stringify(output, null, 2),
        "utf-8"

    )
    const csvHeader = "title,price,location,url,scraped_at\n";

    const csvBody = items
        .map(item =>
            `"${item.title?.replace(/"/g, '""')}","${item.price.value}","${item.location?.replace(/"/g, '""')}","${item.url}","${scrapedAt}"`
        )
        .join("\n");

    fs.writeFileSync(
        "divar_real_estate_3h.csv",
        csvHeader + csvBody,
        "utf-8"
    );

    await browser.close();
    console.log('ok scrapin', items.length);

}


scrapDivar().catch(console.error)

