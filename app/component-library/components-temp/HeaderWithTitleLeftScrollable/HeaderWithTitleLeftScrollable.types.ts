// Third party dependencies.
import { ReactNode } from 'react';
import { SharedValue } from 'react-native-reanimated';

// External dependencies.
import { ButtonIconProps } from '@metamask/design-system-react-native';

// Internal dependencies.
import { HeaderBaseProps } from '../HeaderBase/HeaderBase.types';
import { TitleLeftProps } from '../TitleLeft/TitleLeft.types';

/**
 * Props for the HeaderWithTitleLeftScrollable component.
 */
export interface HeaderWithTitleLeftScrollableProps
  extends Omit<HeaderBaseProps, 'children'> {
  /**
   * Title text displayed in the compact header state.
   * Also used as default title for TitleLeft if titleLeftProps.title is not provided.
   */
  title: string;
  /**
   * Callback when the back button is pressed.
   * If provided, a back button will be rendered as startAccessory.
   */
  onBack?: () => void;
  /**
   * Additional props to pass to the back ButtonIcon.
   * If provided, a back button will be rendered with these props spread.
   */
  backButtonProps?: Omit<ButtonIconProps, 'iconName'>;
  /**
   * Custom node to render in the large title section.
   * If provided, takes priority over titleLeftProps.
   */
  titleLeft?: ReactNode;
  /**
   * Props to pass to the TitleLeft component for the large title section.
   * Only used if titleLeft is not provided.
   */
  titleLeftProps?: TitleLeftProps;
  /**
   * Scroll position (in pixels) at which the header fully collapses.
   * @default measured content height
   */
  scrollTriggerPosition?: number;
  /**
   * Reanimated shared value tracking scroll position.
   * Obtained from useHeaderWithTitleLeftScrollable hook.
   */
  scrollY: SharedValue<number>;
  /**
   * Callback fired when the expanded height is measured.
   * Use this to update ScrollView's contentContainerStyle paddingTop.
   */
  onExpandedHeightChange?: (height: number) => void;
}

/**
 * Options for the useHeaderWithTitleLeftScrollable hook.
 */
export interface UseHeaderWithTitleLeftScrollableOptions {
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
   * Scroll position at which the header fully collapses.
   * @default expandedHeight
   */
  scrollTriggerPosition?: number;
}

/**
 * Return type for the useHeaderWithTitleLeftScrollable hook.
 */
export interface UseHeaderWithTitleLeftScrollableReturn {
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
   * Function to update the expanded height when content is measured.
   * Pass this to HeaderWithTitleLeftScrollable's onExpandedHeightChange prop.
   */
  setExpandedHeight: (height: number) => void;
  /**
   * The scroll position at which the header fully collapses.
   * Defaults to expandedHeight if not provided.
   */
  scrollTriggerPosition: number;
}

