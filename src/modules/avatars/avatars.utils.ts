import { BadRequestError } from '@/utils/errors/ApiErrors.js';
import type { PresetType } from './types.js';

export const VALID_PRESETS = new Set<PresetType>([
  'grayscale',
  'sepia',
  'vintage',
  'kodachrome',
  'brownie',
  'polaroid',
  'blackwhite',
  'invert',
]);

export const STYLE_TEMPLATES = {
  none: ['- Sharp focus'].join('\n'),
  anime: [
    '- Anime illustration style',
    '- Bold outlines',
    '- Vibrant flat colors',
    '- Expressive stylized features',
  ].join('\n'),
  simpsons: [
    '- 1990s prime-time animated sitcom style',
    '- Bright yellow skin tone',
    '- Distinct round bulging eyes and a prominent overbite',
    '- Clean linework with flat, bold colors',
    '- 2D animation cel aesthetic',
  ].join('\n'),
  soviet: [
    '- Vintage Soviet propaganda poster aesthetic',
    '- Heroic and stoic expression',
    '- Bold graphic style with sharp, geometric shapes and high contrast',
    '- Limited color palette dominated by deep red, gold, and dark tones',
    '- Subtle screen-printed texture on aged, weathered paper',
  ].join('\n'),
  oilPainting: [
    '- Classical oil painting portrait in the style of the Old Masters',
    '- Rich, deep colors with smooth brushwork and subtle impasto texture',
    '- Dramatic chiaroscuro lighting with warm golden tones',
    '- Fine craquelure and painterly canvas depth',
  ].join('\n'),
} as const;

export const parseAdjustments = (
  adjustmentsStr: string,
): Record<string, number> => {
  try {
    return JSON.parse(adjustmentsStr);
  } catch {
    throw new BadRequestError('adjustments must be valid JSON');
  }
};
