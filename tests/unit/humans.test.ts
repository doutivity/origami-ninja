import { describe, expect, it } from "vitest";
import { buildHumans, humansDate } from "../../src/site/humans.ts";

const txt = buildHumans({
  date: "2026/11/05",
  components: { Phaser: "4.1.0", Vite: "8.3.5", Docker: "", "GitHub Pages": "" },
  fonts: ["Shippori Mincho", "Hanken Grotesk"],
});

describe("humans.txt", () => {
  it("follows the humanstxt.org sections", () => {
    expect(txt).toContain("/* TEAM */");
    expect(txt).toContain("/* SITE */");
    expect(txt).toContain("/* DEVELOPMENT PROCESS */");
  });

  it("names the developer and repository", () => {
    expect(txt).toContain("Developer: Yaroslav Podorvanov");
    expect(txt).toContain("GitHub: https://github.com/doutivity");
    expect(txt).toContain("Source: https://github.com/doutivity/origami-ninja");
  });

  it("has site facts in English", () => {
    expect(txt).toContain("Last update: 2026/11/05");
    expect(txt).toContain("Language: English");
    expect(txt).toContain("Doctype: HTML5");
    expect(txt).toContain("License: MIT");
  });

  it("puts versions next to components and omits empty ones", () => {
    expect(txt).toContain("Components: Phaser 4.1.0, Vite 8.3.5, Docker, GitHub Pages");
    expect(txt).not.toContain("Docker ,");
  });

  it("lists the fonts", () => {
    expect(txt).toContain("Fonts: Shippori Mincho, Hanken Grotesk");
  });

  it("formats the build date as YYYY/MM/DD", () => {
    expect(humansDate(new Date(2026, 0, 7))).toBe("2026/01/07");
    expect(humansDate(new Date(2026, 10, 25))).toBe("2026/11/25");
  });
});
