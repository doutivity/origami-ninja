// Завантажує обрані шрифти Google Fonts (лише woff2, latin + latin-ext) у src/assets/fonts,
// кладе поруч ліцензії OFL і генерує fonts.css із метриками запасних шрифтів.
// Запуск: `just fonts` (у Docker, без npm-залежностей). Результат комітиться.
import { mkdirSync, writeFileSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";

const OUT = "src/assets/fonts";
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

interface Family {
  name: string;
  slug: string;
  query: string;
  weight: string;
  oflDir: string;
  // Системний шрифт, під який підганяємо метрики запасного
  fallbackLocal: string;
  fallbackStack: string;
  // Відношення ширини тексту реального шрифту до запасного. Виміряно в Chromium
  // (речення англійською, 100px): xAvgCharWidth ненадійний через CJK-гліфи в Shippori.
  widthRatio: number;
}

const FAMILIES: Family[] = [
  {
    name: "Shippori Mincho",
    slug: "shippori-mincho",
    query: "Shippori+Mincho:wght@700",
    weight: "700",
    oflDir: "shipporimincho",
    fallbackLocal: "Times New Roman",
    fallbackStack: '"Times New Roman", serif',
    widthRatio: 1.1494,
  },
  {
    name: "Hanken Grotesk",
    slug: "hanken-grotesk",
    query: "Hanken+Grotesk:wght@100..900",
    weight: "100 900",
    oflDir: "hankengrotesk",
    fallbackLocal: "Arial",
    fallbackStack: "Arial, sans-serif",
    widthRatio: 1.0041,
  },
];

const SUBSETS = ["latin", "latin-ext"];

const get = async (url: string, asText = true) => {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return asText ? res.text() : Buffer.from(await res.arrayBuffer());
};

// --- Мінімальний розбір woff2: потрібні лише head, hhea і OS/2 ---
const KNOWN = [
  "cmap",
  "head",
  "hhea",
  "hmtx",
  "maxp",
  "name",
  "OS/2",
  "post",
  "cvt ",
  "fpgm",
  "glyf",
  "loca",
  "prep",
  "CFF ",
  "VORG",
  "EBDT",
  "EBLC",
  "gasp",
  "hdmx",
  "kern",
  "LTSH",
  "PCLT",
  "VDMX",
  "vhea",
  "vmtx",
  "BASE",
  "GDEF",
  "GPOS",
  "GSUB",
  "EBSC",
  "JSTF",
  "MATH",
  "CBDT",
  "CBLC",
  "COLR",
  "CPAL",
  "SVG ",
  "sbix",
  "acnt",
  "avar",
  "bdat",
  "bloc",
  "bsln",
  "cvar",
  "fdsc",
  "feat",
  "fmtx",
  "fvar",
  "gvar",
  "hsty",
  "just",
  "lcar",
  "mort",
  "morx",
  "opbd",
  "prop",
  "trak",
  "Zapf",
  "Silf",
  "Glat",
  "Gloc",
  "Feat",
  "Sill",
];

function woff2Metrics(buf: Buffer) {
  let pos = 12;
  const numTables = buf.readUInt16BE(pos);
  const totalCompressed = buf.readUInt32BE(20);
  pos = 48;
  const base128 = () => {
    let v = 0;
    for (let i = 0; i < 5; i++) {
      const b = buf[pos++] as number;
      v = v * 128 + (b & 0x7f);
      if (!(b & 0x80)) break;
    }
    return v;
  };
  const dir: { tag: string; len: number }[] = [];
  for (let i = 0; i < numTables; i++) {
    const flags = buf[pos++] as number;
    let tag = KNOWN[flags & 0x3f] as string;
    if ((flags & 0x3f) === 63) {
      tag = buf.toString("latin1", pos, pos + 4);
      pos += 4;
    }
    const version = flags >> 6;
    const orig = base128();
    const transformed = tag === "glyf" || tag === "loca" ? version === 0 : version !== 0;
    dir.push({ tag, len: transformed ? base128() : orig });
  }
  const data = brotliDecompressSync(buf.subarray(pos, pos + totalCompressed));
  const tables = new Map<string, Buffer>();
  let off = 0;
  for (const t of dir) {
    tables.set(t.tag, data.subarray(off, off + t.len));
    off += t.len;
  }
  const head = tables.get("head") as Buffer;
  const hhea = tables.get("hhea") as Buffer;
  const os2 = tables.get("OS/2") as Buffer;
  return {
    upm: head.readUInt16BE(18),
    asc: hhea.readInt16BE(4),
    desc: -hhea.readInt16BE(6),
    gap: hhea.readInt16BE(8),
    avg: os2.readInt16BE(2),
  };
}

mkdirSync(OUT, { recursive: true });
let css = "/* Згенеровано scripts/fonts.ts (`just fonts`). Не редагувати вручну. */\n";

for (const fam of FAMILIES) {
  const src = await get(`https://fonts.googleapis.com/css2?family=${fam.query}&display=swap`);
  const blocks = [...src.matchAll(/\/\* ([\w-]+) \*\/\s*@font-face\s*{([^}]*)}/g)];
  let metrics: ReturnType<typeof woff2Metrics> | undefined;
  for (const subset of SUBSETS) {
    const block = blocks.find((b) => b[1] === subset);
    if (!block) throw new Error(`${fam.name}: subset ${subset} not found`);
    const body = block[2] as string;
    const url = /url\(([^)]+)\)/.exec(body)?.[1] as string;
    const range = /unicode-range:\s*([^;]+);/.exec(body)?.[1] as string;
    const file = `${fam.slug}-${fam.weight.includes(" ") ? "var" : fam.weight}-${subset}.woff2`;
    const bin = (await get(url, false)) as Buffer;
    writeFileSync(`${OUT}/${file}`, bin);
    if (subset === "latin") metrics = woff2Metrics(bin);
    console.log(`${file}  ${bin.length} bytes`);
    css += `@font-face {
  font-family: "${fam.name}";
  font-style: normal;
  font-weight: ${fam.weight};
  font-display: swap;
  src: url("./${file}") format("woff2");
  unicode-range: ${range};
}
`;
  }
  writeFileSync(
    `${OUT}/OFL-${fam.slug}.txt`,
    (await get(
      `https://raw.githubusercontent.com/google/fonts/main/ofl/${fam.oflDir}/OFL.txt`,
    )) as string,
  );

  // Запасний шрифт з підігнаними метриками, щоб не було зсуву макета при заміні.
  const m = metrics as NonNullable<typeof metrics>;
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  const sizeAdjust = fam.widthRatio;
  css += `@font-face {
  font-family: "${fam.name} Fallback";
  src: local("${fam.fallbackLocal}");
  size-adjust: ${pct(sizeAdjust)};
  ascent-override: ${pct(m.asc / m.upm / sizeAdjust)};
  descent-override: ${pct(m.desc / m.upm / sizeAdjust)};
  line-gap-override: ${pct(m.gap / m.upm / sizeAdjust)};
}
`;
  console.log(`${fam.name} metrics`, m, "size-adjust", pct(sizeAdjust));
}

writeFileSync(`${OUT}/fonts.css`, css);
console.log("fonts.css written");
