import type { ComponentType } from 'react';
import { Platform, type ViewProps } from 'react-native';
import { requireNativeViewManager } from 'expo-modules-core';
import { isLiquidGlassAvailable } from 'expo-glass-effect';

export interface TradeGlassMenuAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TradeGlassMenuProps extends ViewProps {
  /** The opening button, in this view's own coordinate space. */
  anchor?: TradeGlassMenuAnchor;
  /** Measured height of the rows; the menu cannot open until it is known. */
  expandedHeight: number;
  horizontalInset?: number;
  /** Space the open menu leaves between itself and the button. */
  gap?: number;
  menuCornerRadius?: number;
  /** How close the menu and its button must be before UIKit fuses them. */
  mergeSpacing?: number;
  colorScheme?: 'auto' | 'light' | 'dark';
  isOpen: boolean;
  /** Fires once the collapse animation has finished. */
  onCollapsed?: () => void;
}

/**
 * Whether the menu can hand its animation to UIKit. The module is Apple-only
 * and its material needs iOS 26, so everywhere else keeps the JS-driven morph.
 */
export const isTradeGlassMenuAvailable = (): boolean =>
  Platform.OS === 'ios' && isLiquidGlassAvailable();

/**
 * A Liquid Glass menu whose frame is animated by UIKit rather than by
 * Reanimated, so the morph never enters the React Native commit path.
 */
const TradeGlassMenu: ComponentType<TradeGlassMenuProps> | null =
  Platform.OS === 'ios'
    ? requireNativeViewManager('TradeGlassMenu', 'TradeGlassMenuView')
    : null;

export default TradeGlassMenu;
