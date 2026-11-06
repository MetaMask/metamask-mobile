import type { IconName } from '@metamask/design-system-react-native';
import type { ComponentType } from 'react';

/** Existing product screen or a prototype placeholder. */
export type FixedTabScreen = ComponentType;

export interface FixedTabPill {
  key: string;
  label: string;
  Screen: FixedTabScreen;
}

export interface FixedTabDefinition {
  key: 'home' | 'money' | 'trade' | 'collect' | 'social';
  label: string;
  routeName: string;
  icon: IconName;
  selectedIcon: IconName;
}
