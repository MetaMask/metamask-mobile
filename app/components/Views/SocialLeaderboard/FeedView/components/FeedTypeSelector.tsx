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
import type { FeedTypeFilter } from '../types';
import { FeedViewSelectorsIDs } from '../FeedView.testIds';
import { FEED_TYPE_LABEL_KEY } from './feedTypeOptions';

export interface FeedTypeSelectorProps {
  value: FeedTypeFilter;
  onPress: () => void;
  testID?: string;
}

/**
 * "All types" pill that opens the feed type bottom sheet. The sheet itself is
 * rendered by `FeedView` (see `FeedTypeSheet`) so it anchors to the screen
 * bottom rather than to this row.
 */
const FeedTypeSelector: React.FC<FeedTypeSelectorProps> = ({
  value,
  onPress,
  testID = FeedViewSelectorsIDs.TYPE_SELECTOR,
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
        {strings(FEED_TYPE_LABEL_KEY[value])}
      </Text>
      <Icon
        name={IconName.ArrowDown}
        size={IconSize.Sm}
        color={IconColor.IconDefault}
      />
    </Box>
  </TouchableOpacity>
);

export default FeedTypeSelector;
