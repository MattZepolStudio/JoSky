import type { Plugin } from 'vite';

const byte = (channel: number) => Math.round(Math.min(1, Math.max(0, channel)) * 255).toString(16).padStart(2, '0');
const gamma = (value: number) => (value <= 0.0031308 ? 12.92 * value : 1.055 * Math.pow(value, 1 / 2.4) - 0.055);
const parseAmount = (value: string) => (value.endsWith('%') ? parseFloat(value) / 100 : parseFloat(value));

function oklchToHex(lightness: number, chroma: number, hue: number, alpha: number): string {
  const a = chroma * Math.cos((hue * Math.PI) / 180);
  const b = chroma * Math.sin((hue * Math.PI) / 180);

  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.2914855480 * b) ** 3;

  const red = gamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const green = gamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const blue = gamma(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);

  return `#${byte(red)}${byte(green)}${byte(blue)}${alpha < 1 ? byte(alpha) : ''}`;
}

export function downgradeCss(css: string): string {
  return css
    .replace(/oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+|none)\s*(?:\/\s*([\d.]+%?))?\s*\)/g, (_match, l, c, h, alpha) =>
      oklchToHex(parseAmount(l), parseAmount(c), h === 'none' ? 0 : parseFloat(h), alpha ? parseAmount(alpha) : 1)
    )
    .replace(/ in ok(?:lab|lch)/g, '');
}

const withoutDvh = (code: string) => code.replace(/(\d)dvh/g, '$1vh');

// The browser built into FiveM ignores oklch(), gradients "in oklab" and dvh, and Tailwind
// keeps its colors in variables that the usual CSS targets cannot lower: cards lose their
// colors. Fixed once the bundle exists, so the website keeps its CSS.
export function legacyCss(): Plugin {
  return {
    name: 'josky-legacy-css',
    generateBundle(_options, bundle) {
      Object.values(bundle).forEach(file => {
        if (file.type === 'chunk') {
          file.code = withoutDvh(file.code);
        } else if (file.fileName.endsWith('.css')) {
          file.source = downgradeCss(withoutDvh(String(file.source)));
        }
      });
    },
  };
}
