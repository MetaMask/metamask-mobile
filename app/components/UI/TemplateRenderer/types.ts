import { SafeComponentListValues } from './SafeComponentList';

export type Sections = string | SectionShape | (string | SectionShape)[];

export interface SectionShape {
  element: keyof SafeComponentListValues;
  key: string;
  props?: Record<string, unknown>;
  children?: Sections;
}
