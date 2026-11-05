// Тонка обгортка track(): без підключеного модуля згоди (аналітика вимкнена) або без згоди нічого не робить.
// Не залежить від Phaser, тож однаково працює на всіх сторінках.
type Tracker = (name: string, params?: Record<string, unknown>) => void;

let tracker: Tracker | null = null;

export const setTracker = (fn: Tracker | null): void => {
  tracker = fn;
};

export const track: Tracker = (name, params) => {
  tracker?.(name, params);
};
