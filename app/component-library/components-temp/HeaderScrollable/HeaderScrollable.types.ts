// Third party dependencies.
import { ReactNode } from 'react';
import { SharedValue } from 'react-native-reanimated';

// External dependencies.
import { IconName } from '@metamask/design-system-react-native';

/**
 * Configuration for an icon button in the header toolbar.
 */
export interface HeaderScrollableIconConfig {
  /**
   * Icon name from the design system.
   */
  iconName: IconName;
  /**
   * Callback when the icon button is pressed.
   */
  onPress: () => void;
  /**
   * Optional test ID for the icon button.
   */
  testID?: string;
}

/**
 * Props for the HeaderScrollable component.
 */
export interface HeaderScrollableProps {
  /**
   * Title text displayed in both large and compact states.
   */
  title: string;
  /**
   * Optional left icon button configuration (e.g., back button).
   */
  leftIcon?: HeaderScrollableIconConfig;
  /**
   * Optional right icon button configuration (e.g., close button).
   */
  rightIcon?: HeaderScrollableIconConfig;
  /**
   * Optional custom content for the large header state.
   * When provided, replaces the default large title.
   */
  largeHeaderContent?: ReactNode;
  /**
   * Scroll distance (in pixels) over which the header fully collapses.
   * @default expandedHeight (140)
   */
  collapseThreshold?: number;
  /**
   * Reanimated shared value tracking scroll position.
   * Obtained from useHeaderScrollable hook.
   */
  scrollY: SharedValue<number>;
  /**
   * Optional test ID for the header container.
   */
  testID?: string;
}

/**
 * Options for the useHeaderScrollable hook.
 */
export interface UseHeaderScrollableOptions {
  /**
   * Height of the header in its expanded (large) state.
   * @default 140
   */
  expandedHeight?: number;
  /**
   * Height of the header in its collapsed (compact) state.
   * @default 56
   */
  collapsedHeight?: number;
  /**
   * Scroll distance over which the header fully collapses.
   * @default expandedHeight
   */
  collapseThreshold?: number;
}

/**
 * Return type for the useHeaderScrollable hook.
 */
export interface UseHeaderScrollableReturn {
  /**
   * Scroll handler to attach to ScrollView's onScroll prop.
   */
  onScroll: (
    event: import('react-native').NativeSyntheticEvent<
      import('react-native').NativeScrollEvent
    >,
  ) => void;
  /**
   * Shared value tracking current scroll position.
   */
  scrollY: SharedValue<number>;
  /**
   * Current header height (animated).
   */
  headerHeight: number;
  /**
   * Expanded header height for initial padding.
   */
  expandedHeight: number;
  /**
   * The scroll distance over which the header collapses.
   * Defaults to expandedHeight if not provided.
   */
  collapseThreshold: number;
}
