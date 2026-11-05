// Банер згоди: position: fixed унизу (без зсуву макета), «Accept» і «Decline» однакової помітності.
import type { ConsentUi } from "./consent.ts";

export interface BannerHandlers {
  accept(): void;
  decline(): void;
}

export function createBannerUi(privacyHref: string, handlers: BannerHandlers): ConsentUi {
  let banner: HTMLElement | null = null;
  let returnFocus: HTMLElement | null = null;

  const build = (): HTMLElement => {
    const el = document.createElement("div");
    el.className = "consent-banner";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Analytics consent");
    el.setAttribute("aria-describedby", "consent-text");
    el.tabIndex = -1;
    el.innerHTML = `<p id="consent-text" class="consent-text">Allow anonymous analytics (Google Analytics) to help improve the game? Nothing is sent to Google unless you accept. <a href="${privacyHref}">Privacy policy</a></p>
<div class="consent-actions"><button type="button" class="consent-btn" data-consent="accept">Accept</button><button type="button" class="consent-btn" data-consent="decline">Decline</button></div>`;
    el.querySelector('[data-consent="accept"]')?.addEventListener("click", handlers.accept);
    el.querySelector('[data-consent="decline"]')?.addEventListener("click", handlers.decline);
    // Escape закриває банер, лише якщо його відкрили з «Cookie settings» (вибір лишається попереднім)
    el.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && el.dataset.reason === "settings") hide();
    });
    return el;
  };

  const hide = (): void => {
    if (!banner) return;
    banner.hidden = true;
    returnFocus?.focus();
    returnFocus = null;
  };

  return {
    show(reason) {
      banner ??= build();
      banner.dataset.reason = reason;
      if (!banner.isConnected) document.body.append(banner);
      banner.hidden = false;
      if (reason === "settings") returnFocus = document.activeElement as HTMLElement | null;
      // Фокус на банер, щоб скрінрідер прочитав текст, а Tab одразу вів до кнопок
      banner.focus({ preventScroll: true });
    },
    hide,
  };
}
