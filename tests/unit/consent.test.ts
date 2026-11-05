import { describe, expect, it } from "vitest";
import {
  type ConsentEnv,
  ConsentManager,
  type ConsentWindow,
  gaCookieDeletions,
  parseStored,
} from "../../src/consent/consent.ts";

const KEY = "k";

function make(
  cfg: { gaId?: string; gtmId?: string; version?: string },
  stored?: string | null,
  cookies = "",
) {
  const win: ConsentWindow = {};
  const scripts: string[] = [];
  const written: string[] = [];
  const shown: string[] = [];
  let hidden = 0;
  const store = new Map<string, string>(stored ? [[KEY, stored]] : []);
  const env: ConsentEnv = {
    win,
    storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v) },
    loadScript: (s) => scripts.push(s),
    readCookies: () => cookies,
    writeCookie: (c) => written.push(c),
    hostname: "doutivity.github.io",
    basePath: "/origami-ninja/",
  };
  const manager = new ConsentManager(
    { gaId: cfg.gaId ?? "", gtmId: cfg.gtmId ?? "", version: cfg.version ?? "v1", storageKey: KEY },
    env,
    { show: (r) => shown.push(r), hide: () => hidden++ },
  );
  const commands = () => (win.dataLayer ?? []).map((a) => Array.from(a as ArrayLike<unknown>));
  return { manager, win, scripts, written, shown, store, hidden: () => hidden, commands, env };
}

describe("analytics disabled (no IDs)", () => {
  it("does nothing at all", () => {
    const t = make({});
    t.manager.init();
    t.manager.track("x");
    expect(t.win.dataLayer).toBeUndefined();
    expect(t.shown).toEqual([]);
    expect(t.scripts).toEqual([]);
  });
});

describe("before consent", () => {
  it("sets Consent Mode v2 defaults with everything denied, before anything else", () => {
    const t = make({ gaId: "G-TEST" });
    t.manager.init();
    const [first] = t.commands();
    expect(first?.slice(0, 2)).toEqual(["consent", "default"]);
    expect(first?.[2]).toEqual({
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  });

  it("does not load gtag.js or gtm.js and shows the banner", () => {
    const t = make({ gaId: "G-TEST", gtmId: "GTM-TEST" });
    t.manager.init();
    expect(t.scripts).toEqual([]);
    expect(t.shown).toEqual(["initial"]);
  });

  it("track() sends nothing", () => {
    const t = make({ gaId: "G-TEST" });
    t.manager.init();
    const before = t.commands().length;
    t.manager.track("level_start", { level: "mountain" });
    expect(t.commands()).toHaveLength(before);
  });

  it("an undecided user is treated as declined", () => {
    const t = make({ gaId: "G-TEST" });
    t.manager.init();
    expect(t.manager.status).toBeNull();
  });
});

describe("Accept", () => {
  it("loads gtag.js and gtm.js and grants only analytics_storage", () => {
    const t = make({ gaId: "G-TEST", gtmId: "GTM-TEST" });
    t.manager.init();
    t.manager.accept();
    expect(t.scripts).toContain("https://www.googletagmanager.com/gtag/js?id=G-TEST");
    expect(t.scripts).toContain("https://www.googletagmanager.com/gtm.js?id=GTM-TEST");
    const update = t.commands().find((c) => c[0] === "consent" && c[1] === "update");
    expect(update?.[2]).toEqual({ analytics_storage: "granted" });
  });

  it("never grants advertising storage", () => {
    const t = make({ gaId: "G-TEST" });
    t.manager.init();
    t.manager.accept();
    const grants = t.commands().filter((c) => c[0] === "consent" && c[1] === "update");
    for (const g of grants) {
      const params = g[2] as Record<string, string>;
      expect(params.ad_storage).toBeUndefined();
      expect(params.ad_user_data).toBeUndefined();
      expect(params.ad_personalization).toBeUndefined();
    }
  });

  it("stores the choice with the policy version and hides the banner", () => {
    const t = make({ gaId: "G-TEST", version: "v7" });
    t.manager.init();
    t.manager.accept();
    expect(JSON.parse(t.store.get(KEY) as string)).toEqual({ status: "granted", version: "v7" });
    expect(t.hidden()).toBe(1);
  });

  it("loads scripts only once", () => {
    const t = make({ gaId: "G-TEST" });
    t.manager.init();
    t.manager.accept();
    t.manager.accept();
    expect(t.scripts).toHaveLength(1);
  });

  it("track() sends events through gtag", () => {
    const t = make({ gaId: "G-TEST" });
    t.manager.init();
    t.manager.accept();
    t.manager.track("death", { cause: "fire" });
    expect(t.commands().some((c) => c[0] === "event" && c[1] === "death")).toBe(true);
  });

  it("with only GTM, events are pushed as custom dataLayer events", () => {
    const t = make({ gtmId: "GTM-ONLY" });
    t.manager.init();
    t.manager.accept();
    t.manager.track("checkpoint", { index: 1 });
    expect(t.win.dataLayer?.some((x) => (x as { event?: string }).event === "checkpoint")).toBe(
      true,
    );
  });
});

describe("returning visitors", () => {
  it("stored granted: scripts load without showing the banner", () => {
    const t = make({ gaId: "G-TEST" }, JSON.stringify({ status: "granted", version: "v1" }));
    t.manager.init();
    expect(t.scripts).toHaveLength(1);
    expect(t.shown).toEqual([]);
  });

  it("stored denied: no scripts, no banner, GA disabled", () => {
    const t = make({ gaId: "G-TEST" }, JSON.stringify({ status: "denied", version: "v1" }));
    t.manager.init();
    expect(t.scripts).toEqual([]);
    expect(t.shown).toEqual([]);
    expect(t.win["ga-disable-G-TEST"]).toBe(true);
  });

  it("a new policy version asks again and loads nothing", () => {
    const t = make({ gaId: "G-TEST" }, JSON.stringify({ status: "granted", version: "OLD" }));
    t.manager.init();
    expect(t.shown).toEqual(["initial"]);
    expect(t.scripts).toEqual([]);
  });

  it("Cookie settings reopens the banner", () => {
    const t = make({ gaId: "G-TEST" }, JSON.stringify({ status: "denied", version: "v1" }));
    t.manager.init();
    t.manager.openSettings();
    expect(t.shown.at(-1)).toBe("settings");
  });
});

describe("withdrawing consent", () => {
  const granted = JSON.stringify({ status: "granted", version: "v1" });

  it("disables GA and stops tracking", () => {
    const t = make({ gaId: "G-TEST" }, granted, "_ga=1");
    t.manager.init();
    t.manager.decline();
    expect(t.win["ga-disable-G-TEST"]).toBe(true);
    const before = t.commands().length;
    t.manager.track("x");
    expect(t.commands()).toHaveLength(before);
  });

  it("denies analytics_storage again", () => {
    const t = make({ gaId: "G-TEST" }, granted, "_ga=1");
    t.manager.init();
    t.manager.decline();
    const last = t
      .commands()
      .filter((c) => c[0] === "consent" && c[1] === "update")
      .at(-1);
    expect(last?.[2]).toEqual({ analytics_storage: "denied" });
  });

  it("removes _ga cookies, for parent domains and the base path, and leaves others", () => {
    const t = make({ gaId: "G-TEST" }, granted, "_ga=1; _ga_ABC=2; keep=3");
    t.manager.init();
    t.manager.decline();
    expect(t.written.length).toBeGreaterThan(0);
    expect(t.written.every((c) => c.startsWith("_ga"))).toBe(true);
    expect(t.written.some((c) => c.includes("domain=.github.io"))).toBe(true);
    expect(t.written.some((c) => c.includes("path=/origami-ninja/"))).toBe(true);
    expect(t.written.every((c) => c.includes("Max-Age=0"))).toBe(true);
  });

  it("stores the withdrawal", () => {
    const t = make({ gaId: "G-TEST" }, granted);
    t.manager.init();
    t.manager.decline();
    expect(JSON.parse(t.store.get(KEY) as string).status).toBe("denied");
  });
});

describe("robustness", () => {
  it("survives unavailable storage", () => {
    const t = make({ gaId: "G-TEST" });
    t.env.storage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() => t.manager.init()).not.toThrow();
    expect(() => t.manager.accept()).not.toThrow();
    expect(t.manager.status).toBe("granted");
  });
});

describe("helpers", () => {
  it("parseStored accepts only the current version and valid status", () => {
    expect(parseStored(null, "v1")).toBeNull();
    expect(parseStored("{", "v1")).toBeNull();
    expect(parseStored('{"status":"maybe","version":"v1"}', "v1")).toBeNull();
    expect(parseStored('{"status":"granted","version":"v0"}', "v1")).toBeNull();
    expect(parseStored('{"status":"denied","version":"v1"}', "v1")).toEqual({
      status: "denied",
      version: "v1",
    });
  });

  it("gaCookieDeletions ignores cookies that are not _ga*", () => {
    expect(gaCookieDeletions("a=1; b=2", "x.com", "/")).toEqual([]);
  });

  it("gaCookieDeletions covers each domain and path once", () => {
    const out = gaCookieDeletions("_ga=1", "a.b.example.com", "/");
    expect(out).toHaveLength(4); // host, .a.b.example.com, .b.example.com, .example.com
    expect(new Set(out).size).toBe(out.length);
  });
});
