import React from 'react';
import { Pressable } from 'react-native';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SectionDivider,
  SectionHeader,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { EarnActionRow } from './earnActionRows';

interface EarnActionSectionProps<Key extends string> {
  title: string;
  rows: EarnActionRow<Key>[];
  /** Called with the row that was pressed. */
  onPressRow: (key: Key) => void;
  /** A section above this one supplies the divider and header spacing. */
  followsSection: boolean;
  testIDs: {
    container: string;
    header: string;
    row: string;
  };
}

/**
 * A titled list of rows that look like the Your earnings rows, with a right
 * arrow where the figure would be. Which rows appear, and where each goes, is
 * the caller's decision.
 */
function EarnActionSection<Key extends string>({
  title,
  rows,
  onPressRow,
  followsSection,
  testIDs,
}: EarnActionSectionProps<Key>) {
  return (
    <>
      {followsSection ? <SectionDivider marginVertical={8} /> : null}
      <SectionHeader
        title={title}
        className={followsSection ? 'pt-0 pb-4' : 'pt-4 pb-4'}
        testID={testIDs.header}
      />
      <Box className="gap-4 px-4" testID={testIDs.container}>
        {rows.map((row) => (
          <Pressable
            key={row.key}
            accessibilityRole="button"
            accessibilityLabel={row.title}
            onPress={() => onPressRow(row.key)}
            testID={`${testIDs.row}-${row.key}`}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              className="gap-3"
            >
              <AvatarIcon
                iconName={row.iconName}
                size={AvatarIconSize.Md}
                severity={AvatarIconSeverity.Neutral}
                iconProps={{ color: IconColor.IconAlternative }}
              />
              <Box className="flex-1">
                <Text variant={TextVariant.BodyMd}>{row.title}</Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {row.description}
                </Text>
              </Box>
              <Icon
                name={IconName.ArrowRight}
                size={IconSize.Md}
                color={IconColor.IconAlternative}
              />
            </Box>
          </Pressable>
        ))}
      </Box>
    </>
  );
}

export default EarnActionSection;
