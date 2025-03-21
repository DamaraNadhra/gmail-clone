import * as cheerio from "cheerio";

export class CheerioHelper {
  static sanitizeHtml(html: string) {

    const $ = cheerio.load(html);

    $("style").each((_, style) => {
      let cssText = $(style).html() || "";

      // Remove only @media (prefers-color-scheme: dark) blocks
      cssText = cssText.replace(
        /@media\s*\(\s*prefers-color-scheme:\s*dark\s*\)\s*{([^{}]*{[^{}]*})*[^}]*}/gis,
        ""
      );

      if (!cssText?.trim()) {
        $(style).remove(); // Remove empty <style> tags
      } else {
        $(style).text(cssText); // Update the style tag
      }
    });

    return $.html();
  }
}
