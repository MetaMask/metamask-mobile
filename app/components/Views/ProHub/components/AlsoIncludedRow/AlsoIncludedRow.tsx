import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconSize,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { AlsoIncludedItem } from '../../ProHub.constants';
import { AlsoIncludedRowTestIds } from './AlsoIncludedRow.testIds';

interface AlsoIncludedRowProps {
  item: AlsoIncludedItem;
  testID?: string;
}

const AlsoIncludedRow = ({ item, testID }: AlsoIncludedRowProps) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Start}
    twClassName="gap-x-4 py-3"
    testID={testID ?? AlsoIncludedRowTestIds.ROW(item.id)}
  >
    <Box twClassName="w-10 h-10 rounded-full bg-background-section items-center justify-center shrink-0">
      <Icon
        name={item.iconName}
        size={IconSize.Md}
        color={IconColor.IconAlternative}
      />
    </Box>

    <Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-x-2 flex-wrap"
      >
        <Text variant={TextVariant.BodyLg} fontWeight={FontWeight.Medium}>
          {strings(item.titleKey)}
        </Text>
        {item.badgeKey ? (
          <Tag twClassName="self-center" severity={TagSeverity.Neutral}>
            {strings(item.badgeKey)}
          </Tag>
        ) : null}
      </Box>
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {strings(item.subtitleKey)}
      </Text>
    </Box>
  </Box>
);

export default AlsoIncludedRow;
