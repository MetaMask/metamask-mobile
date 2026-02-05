import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  FontWeight,
} from '@metamask/design-system-react-native';
import type { SnapshotPrerequisiteDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { getIconName } from '../../utils/formatUtils';

/**
 * Props for the SnapshotPrerequisiteItem component
 */
interface SnapshotPrerequisiteItemProps {
  /**
   * The prerequisite data to display
   */
  prerequisite: SnapshotPrerequisiteDto;

  /**
   * Whether this prerequisite has been satisfied
   */
  satisfied?: boolean;

  /**
   * Current progress count (e.g., 2 out of 5)
   */
  current?: number;

  /**
   * Required count to satisfy the prerequisite (e.g., 5)
   */
  required?: number;
}

/**
 * SnapshotPrerequisiteItem displays a single prerequisite with icon, title, description, and progress badge.
 *
 * Layout: [Icon] | Title + Description | [Progress Badge showing current/required]
 *
 * @example
 * <SnapshotPrerequisiteItem
 *   prerequisite={prerequisite}
 *   satisfied={true}
 *   current={5}
 *   required={5}
 * />
 */
const SnapshotPrerequisiteItem: React.FC<SnapshotPrerequisiteItemProps> = ({
  prerequisite,
  satisfied = false,
  current,
  required,
}) => {
  const showProgressBadge = current !== undefined && required !== undefined;

  return (
    <Box
      twClassName="flex-row items-center py-3 px-4 gap-4"
      testID="snapshot-prerequisite-item"
    >
      {/* Prerequisite Icon */}
      <Box
        twClassName={`h-10 w-10 rounded-full items-center justify-center ${
          satisfied ? 'bg-success-muted' : 'bg-muted'
        }`}
        testID="snapshot-prerequisite-item-icon-container"
      >
        <Icon
          name={getIconName(prerequisite.iconName)}
          size={IconSize.Lg}
          twClassName={
            satisfied ? 'text-success-default' : 'text-icon-alternative'
          }
          testID="snapshot-prerequisite-item-icon"
        />
      </Box>

      {/* Prerequisite Info */}
      <Box twClassName="flex-1">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName="text-text-default"
          testID="snapshot-prerequisite-item-title"
        >
          {prerequisite.title}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          twClassName="text-text-alternative"
          testID="snapshot-prerequisite-item-description"
        >
          {prerequisite.description}
        </Text>
      </Box>

      {/* Progress Badge or Checkmark */}
      {satisfied ? (
        <Box
          twClassName="h-6 w-6 rounded-full bg-success-default items-center justify-center"
          testID="snapshot-prerequisite-item-checkmark"
        >
          <Icon
            name={IconName.Check}
            size={IconSize.Sm}
            twClassName="text-primary-inverse"
          />
        </Box>
      ) : showProgressBadge ? (
        <Box
          twClassName="bg-muted rounded-full px-3 py-1"
          testID="snapshot-prerequisite-item-progress-badge"
        >
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            twClassName="text-text-alternative"
          >
            {current}/{required}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
};

export default SnapshotPrerequisiteItem;
