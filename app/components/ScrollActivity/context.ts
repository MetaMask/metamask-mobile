import { createContext, type RefObject } from 'react';
import type { View } from 'react-native';
import type { ActivityRegistry } from './ActivityRegistry';

export interface ActivitySlotContextValue {
  id: string;
  joined: boolean;
}

export const RegistryContext = createContext<ActivityRegistry | null>(null);
export const SlotContext = createContext<ActivitySlotContextValue | null>(null);
export const ContentHostContext = createContext<RefObject<View | null> | null>(
  null,
);
