// Список записів devlog. Новий запис = новий файл + рядок тут (новіші зверху).
import { entry as prototype } from "./001-prototype.ts";
import { entry as pagoda } from "./002-pagoda.ts";
import { entry as canyon } from "./003-midnight-canyon.ts";
import { entry as marsh } from "./004-ink-marsh.ts";
import { entry as workshop } from "./005-kirigami-workshop.ts";
import { entry as sea } from "./006-paper-sea.ts";
import type { DevlogEntry } from "./types.ts";

export type { DevlogEntry } from "./types.ts";

export const devlog: DevlogEntry[] = [prototype, pagoda, canyon, marsh, workshop, sea].sort(
  (a, b) => b.date.localeCompare(a.date),
);
