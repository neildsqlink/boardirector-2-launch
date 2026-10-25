/* timeline helpers shared by the film and its shots — everything is a
   pure function of time, so any frame can be rendered on its own */
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const span = (t, a, b) => clamp((t - a) / (b - a));
export const out3 = (p) => 1 - (1 - p) ** 3;
export const inOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
export const mix = (a, b, p) => a + (b - a) * p;
