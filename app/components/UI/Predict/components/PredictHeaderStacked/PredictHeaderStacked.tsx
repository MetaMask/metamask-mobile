import React from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  type ButtonIconProps,
} from '@metamask/design-system-react-native';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import ButtonIconGlass from '../../../../../component-library/components-temp/ButtonIconGlass';
import { PredictVenueSelectorButton } from '../../../PredictNext/venueSelection';
import type { SharedValue } from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import {
  PredictMarketListSelectorsIDs,
  PredictSearchSelectorsIDs,
} from '../../Predict.testIds';
import { PREDICT_HEADER_STACKED_TEST_IDS } from './PredictHeaderStacked.testIds';

export interface PredictHeaderStackedProps {
  /**
   * Scroll offset shared value from the page's Animated.ScrollView.
   * Fades the glass backdrop. The title stays centered in the bar.
   */
  scrollY: SharedValue<number>;
  /**
   * Title shown both as the large title (by the page) and the compact title.
   * Defaults to the shared "Predictions" string.
   */
  title?: string;
  /** Back button handler. */
  onBack: () => void;
  /** Search icon handler. Opens the existing Predict search flow. */
  onSearchPress: () => void;
  /**
   * Floats the header over the page on its glass backdrop, with back and
   * search in capsules, as on the brand refresh.
   */
  isGlass?: boolean;
  /** Reports the floating header's height; pair with `useHeaderGlassInset`. */
  onLayout?: (event: LayoutChangeEvent) => void;
  testID?: string;
}

/**
 * Predict navigation header.
 *
 * Thin wrapper over `HeaderStandardGlass`, baking in the Predict back
 * navigation, the venue picker (absent unless more than one Venue is
 * selectable) and the search icon. The page title stays centered in the bar.
 */
const PredictHeaderStacked: React.FC<PredictHeaderStackedProps> = ({
  scrollY,
  title = strings('wallet.predict'),
  onBack,
  onSearchPress,
  isGlass = false,
  onLayout,
  testID = PREDICT_HEADER_STACKED_TEST_IDS.HEADER,
}) => {
  const searchButtonProps: ButtonIconProps = {
    iconName: IconName.Search,
    size: ButtonIconSize.Md,
    onPress: onSearchPress,
    accessibilityLabel: strings('predict.search_placeholder'),
    testID: PredictSearchSelectorsIDs.SEARCH_BUTTON,
  };

  return (
    <HeaderStandardGlass
      isGlass={isGlass}
      onLayout={onLayout}
      testID={testID}
      includesTopInset
      title={title}
      titleProps={{
        accessibilityRole: 'header',
        testID: PREDICT_HEADER_STACKED_TEST_IDS.COMPACT_TITLE,
      }}
      scrollY={scrollY}
      onBack={onBack}
      backButtonProps={{
        accessibilityLabel: strings('navigation.back'),
        testID: PredictMarketListSelectorsIDs.BACK_BUTTON,
      }}
      endAccessory={
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
        >
          <PredictVenueSelectorButton
            variant={isGlass ? 'glass' : 'standard'}
          />
          {isGlass ? (
            <ButtonIconGlass isCapsule {...searchButtonProps} />
          ) : (
            <ButtonIcon {...searchButtonProps} />
          )}
        </Box>
      }
    />
  );
};

export default PredictHeaderStacked;
