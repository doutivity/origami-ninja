// Список записів devlog. Новий запис = новий файл + рядок тут (новіші зверху).
import { entry as prototype } from "./001-prototype.ts";
import type { DevlogEntry } from "./types.ts";

export type { DevlogEntry } from "./types.ts";

export const devlog: DevlogEntry[] = [prototype].sort((a, b) => b.date.localeCompare(a.date));
