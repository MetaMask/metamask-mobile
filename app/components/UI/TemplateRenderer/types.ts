import { SafeComponentListValues } from './SafeComponentList';

export type TemplateRendererInput =
  | string
  | TemplateRendererComponent
  | (string | TemplateRendererComponent)[];

export interface TemplateRendererComponent {
  element: keyof SafeComponentListValues;
  key: string;
  props?: Record<string, unknown>;
  children?: TemplateRendererInput;
}
