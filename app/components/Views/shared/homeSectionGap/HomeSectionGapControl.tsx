import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  BoxBackgroundColor,
  BoxBorderColor,
  FilterButton,
  SegmentedControl,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

import { TAB_BAR_FLOATING_HEIGHT } from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.constants';
import { getTabBarFloatingBottomPadding } from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.utils';
import { isE2EOrExpEnvironment } from '../../../../util/test/utils';
import {
  HOME_SECTION_GAP_CONTROL_TEST_ID,
  HOME_SECTION_GAP_OPTIONS,
  homeSectionGapOptionTestId,
  parseHomeSectionGapSelection,
} from './homeSectionGap';
import {
  setHomeSectionGapSelection,
  useHomeSectionGapSelection,
} from './homeSectionGapStore';

/**
 * Dev/QA review chrome only. Release builds, Jest, and e2e/exp builds omit it
 * so it never ships as a user setting.
 */
export const isHomeSectionGapControlEnabled =
  __DEV__ && process.env.NODE_ENV !== 'test' && !isE2EOrExpEnvironment;

const SECTION_GAP_ABOVE_TAB_BAR_PX = 8;

/**
 * Floating control on the wallet home screen for comparing 8, 12, 16, and 24px
 * between sections. The selected default is production (20px).
 */
export const HomeSectionGapControlImpl = () => {
  const selection = useHomeSectionGapSelection();
  const selectedValue =
    selection === 'production' ? 'production' : String(selection);
  const insets = useSafeAreaInsets();
  const bottom =
    getTabBarFloatingBottomPadding(insets.bottom) +
    TAB_BAR_FLOATING_HEIGHT +
    SECTION_GAP_ABOVE_TAB_BAR_PX;

  const handleChange = (value: string) => {
    const next = parseHomeSectionGapSelection(value);

    if (next) {
      setHomeSectionGapSelection(next);
    }
  };

  return (
    <Box
      backgroundColor={BoxBackgroundColor.BackgroundDefault}
      borderColor={BoxBorderColor.BorderMuted}
      gap={2}
      padding={3}
      pointerEvents="auto"
      style={{ bottom }}
      testID={HOME_SECTION_GAP_CONTROL_TEST_ID}
      twClassName="absolute left-4 right-4 z-10 rounded-xl border"
    >
      <Text variant={TextVariant.BodySm}>Between sections</Text>
      <SegmentedControl
        isFullWidth
        onChange={handleChange}
        value={selectedValue}
      >
        <FilterButton
          accessibilityLabel="Production section gap, 20 pixels"
          testID={homeSectionGapOptionTestId('production')}
          value="production"
        >
          20
        </FilterButton>
        {HOME_SECTION_GAP_OPTIONS.map((option) => (
          <FilterButton
            accessibilityLabel={`${option} pixel section gap`}
            key={option}
            testID={homeSectionGapOptionTestId(option)}
            value={String(option)}
          >
            {option}
          </FilterButton>
        ))}
      </SegmentedControl>
      <Text variant={TextVariant.BodySm}>Header to content: 16px</Text>
    </Box>
  );
};

const HomeSectionGapControl = () => {
  if (!isHomeSectionGapControlEnabled) {
    return null;
  }

  return <HomeSectionGapControlImpl />;
};

export default HomeSectionGapControl;
