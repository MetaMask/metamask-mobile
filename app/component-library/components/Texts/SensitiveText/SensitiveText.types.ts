// external dependencies
import { TextProps } from '../Text/Text.types';

export enum SensitiveLengths {
  Short = 7,
  Medium = 9,
  Long = 13,
}

export interface SensitiveTextProps extends TextProps {
  isHidden: boolean;
  length: SensitiveLengths;
  children: string;
}
