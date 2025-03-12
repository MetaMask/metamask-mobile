import { JSXElement, SnapsChildren } from '@metamask/snaps-sdk/jsx';
import { Theme } from '../../../../util/theme/models';

export interface UIComponentParams<T extends JSXElement> {
  map: Record<string, number>;
  element: T;
  form?: string;
  useFooter?: boolean;
  onCancel?: () => void;
  t: (key: string) => string;
  theme: Theme;
}

export interface UIComponent {
  element: string;
  props?: Record<string, unknown>;
  children?: SnapsChildren<UIComponent | string>;
  key?: string;
}

export type UIComponentFactory<T extends JSXElement> = (
  params: UIComponentParams<T>,
) => UIComponent;
