import { ChangeEvent as ReactChangeEvent } from 'react';
import { JSXElement, SnapsChildren } from '@metamask/snaps-sdk/jsx';

export interface UIComponentParams<T extends JSXElement> {
  map: Record<string, number>;
  element: T;
  form?: string;
  useFooter?: boolean;
  onCancel?: () => void;
  promptLegacyProps?: {
    onInputChange: (event: ReactChangeEvent<HTMLInputElement>) => void;
    inputValue: string;
    placeholder?: string;
  };
  t: (key: string) => string;
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
