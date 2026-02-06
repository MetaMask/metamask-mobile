import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconSize,
  FontWeight,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import TagBase, {
  TagSeverity,
} from '../../../../../component-library/base-components/TagBase';
import { TextVariant as CLTextVariant } from '../../../../../component-library/components/Texts/Text';
import type {
  SnapshotPrerequisiteDto,
  SnapshotPrerequisiteStatusDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { getIconName } from '../../utils/formatUtils';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

/**
 * Props for the SnapshotPrerequisiteItem component
 */
interface SnapshotPrerequisiteItemProps {
  /**
   * The prerequisite data to display
   */
  prerequisite: SnapshotPrerequisiteDto;

  /**
   * Status information for this prerequisite (satisfied, current, required)
   */
  status?: SnapshotPrerequisiteStatusDto;

  /**
   * Whether to hide the status badge on the right side
   * @default false
   */
  hideStatus?: boolean;
}

/**
 * SnapshotPrerequisiteItem displays a single prerequisite with icon, title, description, and progress badge.
 *
 * Layout: [Icon] | Title + Description | [Progress Badge showing current/required]
 *
 * @example
 * <SnapshotPrerequisiteItem
 *   prerequisite={prerequisite}
 *   status={{ satisfied: true, current: 5, required: 5 }}
 * />
 */
const SnapshotPrerequisiteItem: React.FC<SnapshotPrerequisiteItemProps> = ({
  prerequisite,
  status,
  hideStatus = false,
}) => {
  const tw = useTailwind();
  return (
    <Box twClassName="gap-2" testID="snapshot-prerequisite-item">
      <Box flexDirection={BoxFlexDirection.Row} gap={3}>
        {/* Prerequisite Icon */}
        <Icon
          name={getIconName(prerequisite.iconName)}
          size={IconSize.Lg}
          testID="snapshot-prerequisite-item-icon"
        />

        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName="text-text-default flex-1"
          testID="snapshot-prerequisite-item-title"
        >
          {prerequisite.title}
        </Text>

        {/* Progress Badge or Checkmark */}
        {!hideStatus && (
          <TagBase
            severity={TagSeverity.Neutral}
            style={tw.style('bg-muted rounded-lg')}
            gap={4}
            textProps={{ variant: CLTextVariant.BodySMMedium }}
            testID="snapshot-prerequisite-item-progress-badge"
            startAccessory={
              <Icon
                name={getIconName(prerequisite.iconName)}
                size={IconSize.Sm}
                twClassName="text-icon-alternative"
                testID="snapshot-prerequisite-item-icon"
              />
            }
          >
            {`${status?.current ?? 0}/${status?.required ?? prerequisite.minCount}`}
          </TagBase>
        )}
      </Box>

      <Box flexDirection={BoxFlexDirection.Row}>
        <Box twClassName="w-9" />
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          twClassName="text-alternative text-left flex-1v"
        >
          {prerequisite.description}
        </Text>
      </Box>
    </Box>
  );
};

export default SnapshotPrerequisiteItem;
