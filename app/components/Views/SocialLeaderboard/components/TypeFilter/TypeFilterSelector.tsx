import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import type { SocialTypeFilter } from './types';
import { TypeFilterSelectorsIDs } from './TypeFilter.testIds';
import { TYPE_FILTER_LABEL_KEY } from './typeFilterOptions';

export interface TypeFilterSelectorProps {
  value: SocialTypeFilter;
  onPress: () => void;
  testID?: string;
}

/**
 * "All types" pill that opens the {@link TypeFilterSheet} bottom sheet. Shared
 * by the leaderboard (`TopTradersView`) and the feed (`FeedView`); the sheet is
 * rendered by the host screen so it anchors to the screen bottom rather than to
 * this row.
 */
const TypeFilterSelector: React.FC<TypeFilterSelectorProps> = ({
  value,
  onPress,
  testID = TypeFilterSelectorsIDs.SELECTOR,
}) => (
  <TouchableOpacity
    onPress={onPress}
    accessibilityRole="button"
    testID={testID}
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={1}
      twClassName="bg-muted rounded-xl px-3 h-10"
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
      >
        {strings(TYPE_FILTER_LABEL_KEY[value])}
      </Text>
      <Icon
        name={IconName.ArrowDown}
        size={IconSize.Sm}
        color={IconColor.IconDefault}
      />
    </Box>
  </TouchableOpacity>
);

export default TypeFilterSelector;
