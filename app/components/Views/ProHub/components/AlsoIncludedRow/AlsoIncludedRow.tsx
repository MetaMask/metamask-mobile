import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
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
  onPress?: (id: string) => void;
}

const AlsoIncludedRow = ({ item, testID, onPress }: AlsoIncludedRowProps) => {
  const title = strings(item.titleKey);
  const rowTestId = testID ?? AlsoIncludedRowTestIds.ROW(item.id);

  const content = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Start}
      twClassName="gap-x-4 py-3"
    >
      <Box twClassName="w-10 h-10 rounded-full bg-background-section items-center justify-center shrink-0">
        <Icon
          name={item.iconName}
          size={IconSize.Md}
          color={IconColor.IconAlternative}
        />
      </Box>

      <Box twClassName="flex-1 min-w-0">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-x-2 flex-wrap"
        >
          <Text variant={TextVariant.BodyLg} fontWeight={FontWeight.Medium}>
            {title}
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

      {onPress ? (
        <Box twClassName="self-center">
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
        </Box>
      ) : null}
    </Box>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={() => onPress(item.id)}
        accessibilityRole="button"
        accessibilityLabel={title}
        testID={rowTestId}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <Box testID={rowTestId}>{content}</Box>;
};

export default AlsoIncludedRow;
