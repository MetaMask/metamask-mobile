import { JSXElement, SnapsChildren } from '@metamask/snaps-sdk/jsx';
import { Theme } from '../../../../util/theme/models';

export interface UIComponentParams<T extends JSXElement> {
  map: Record<string, number>;
  element: T;
  form?: string;
  useFooter?: boolean;
  onCancel?: () => void;
  t: (key: string) => string;

  // React Native specific props
  theme: Theme;
  // If the component must inherit the size of the parent, the parent must pass this size to their children.
  textSize?: string;
  // If the component must inherit the color of the parent, the parent must pass this color to their children.
  textColor?: string;
  // If the component must inherit the variant of the parent, the parent must pass this variant to their children.
  textVariant?: string;
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
