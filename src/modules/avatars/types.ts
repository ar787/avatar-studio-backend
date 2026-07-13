import { FieldValue } from 'firebase-admin/firestore';

export type Adjustments = Record<string, number>;
export type PresetType =
  | 'grayscale'
  | 'sepia'
  | 'vintage'
  | 'kodachrome'
  | 'brownie'
  | 'polaroid'
  | 'blackwhite'
  | 'invert';
export type GeneratedImage = {
  url: string;
  prompt: string;
  storagePath: string;
  extension: 'png';
  createdAt: Date | FieldValue;
  adjustments?: Adjustments;
  preset?: PresetType;
};
