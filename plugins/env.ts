// Змінні збірки, спільні для Vite-конфігу, плагінів і скриптів: SITE_URL, BASE_PATH, GA_MEASUREMENT_ID.
const rawSite = process.env.SITE_URL ?? "http://localhost:5173";
const rawBase = process.env.BASE_PATH ?? "/";

/** Абсолютна адреса без кінцевого слеша, напр. https://doutivity.github.io/origami-ninja */
export const siteUrl = rawSite.replace(/\/+$/, "");

/** Vite base: завжди починається і закінчується на "/". */
export const basePath = `/${rawBase.replace(/^\/+|\/+$/g, "")}/`.replace("//", "/");

export const gaId = process.env.GA_MEASUREMENT_ID ?? "";

/** Контейнер Google Tag Manager (необов'язково): вантажиться лише після згоди. */
export const gtmId = process.env.GTM_CONTAINER_ID ?? "";

/** Аналітика ввімкнена, лише якщо задано хоча б один ідентифікатор. Інакше банера й скриптів немає. */
export const analyticsEnabled = gaId !== "" || gtmId !== "";
