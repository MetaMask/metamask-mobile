// Third party dependencies.
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

// External dependencies.
import { SharedValue } from 'react-native-reanimated';

// Internal dependencies.
import { HeaderCompactStandardProps } from '../HeaderCompactStandard/HeaderCompactStandard.types';

/**
 * HeaderStandardAnimated component props.
 * Extends HeaderCompactStandardProps with scroll-driven animation inputs.
 */
export interface HeaderStandardAnimatedProps
  extends HeaderCompactStandardProps {
  /**
   * Shared value for scroll offset from the ScrollView.
   * Used to drive the center-title animation when scroll passes the title section.
   */
  scrollY: SharedValue<number>;
  /**
   * Shared value for the height of the title section (first child of ScrollView).
   * When scrollY >= titleSectionHeight, the compact center title is shown.
   */
  titleSectionHeight: SharedValue<number>;
}

/**
 * Return type for useHeaderStandardAnimated hook.
 */
export interface UseHeaderStandardAnimatedReturn {
  scrollY: SharedValue<number>;
  titleSectionHeightSv: SharedValue<number>;
  setTitleSectionHeight: (height: number) => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}
