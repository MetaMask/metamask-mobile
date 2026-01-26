// Third party dependencies.
import { ReactNode } from 'react';
import { SharedValue } from 'react-native-reanimated';

// External dependencies.
import {
  ButtonIconProps,
  TextProps,
} from '@metamask/design-system-react-native';

// Internal dependencies.
import { HeaderBaseProps } from '../../components/HeaderBase';
import { TitleLeftProps } from '../TitleLeft/TitleLeft.types';

/**
 * Props for the HeaderWithTitleLeftScrollable component.
 */
export interface HeaderWithTitleLeftScrollableProps extends HeaderBaseProps {
  /**
   * Title text displayed in the compact header state.
   * Also used as default title for TitleLeft if titleLeftProps.title is not provided.
   */
  title: string;
  /**
   * Additional props to pass to the title Text component in the compact header.
   * Props are spread to the Text component and can override default values.
   */
  titleProps?: Partial<TextProps>;
  /**
   * Subtitle text to display below the title in the compact header.
   * Rendered with TextVariant.BodySm and TextColor.TextAlternative by default.
   */
  subtitle?: string;
  /**
   * Additional props to pass to the subtitle Text component.
   * Props are spread to the Text component and can override default values.
   */
  subtitleProps?: Partial<TextProps>;
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
   * Callback when the close button is pressed.
   * If provided, a close button will be added to endButtonIconProps.
   */
  onClose?: () => void;
  /**
   * Additional props to pass to the close ButtonIcon.
   * If provided, a close button will be added to endButtonIconProps with these props spread.
   */
  closeButtonProps?: Omit<ButtonIconProps, 'iconName'>;
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
  /**
   * Whether the header is inside a SafeAreaView.
   * When true, positions the header at the safe area boundary instead of top-0.
   * @default false
   */
  isInsideSafeAreaView?: boolean;
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
   * Expanded header height for initial padding.
   * Use this for ScrollView's contentContainerStyle paddingTop.
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
