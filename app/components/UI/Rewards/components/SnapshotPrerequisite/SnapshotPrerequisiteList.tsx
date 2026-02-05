import React from 'react';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import type {
  SnapshotPrerequisitesDto,
  SnapshotPrerequisiteStatusDto,
  SnapshotPrerequisiteDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import SnapshotPrerequisiteItem from './SnapshotPrerequisiteItem';

/**
 * Props for the SnapshotPrerequisiteList component
 */
interface SnapshotPrerequisiteListProps {
  /**
   * The prerequisites data containing logic operator and conditions
   */
  prerequisites: SnapshotPrerequisitesDto;

  /**
   * Optional status for each prerequisite
   * When provided, progress data will be displayed
   */
  prerequisiteStatuses?: SnapshotPrerequisiteStatusDto[];
}

/**
 * LogicSeparator displays 'AND' or 'OR' text between prerequisite items
 * Layout: [line] - [text] - [line]
 */
interface LogicSeparatorProps {
  logic: 'AND' | 'OR';
}

const LogicSeparator: React.FC<LogicSeparatorProps> = ({ logic }) => (
  <Box twClassName="flex-row items-center py-2" testID="logic-separator">
    <Box twClassName="flex-1 h-px bg-border-muted" />
    <Text
      variant={TextVariant.BodySm}
      twClassName="mx-4 text-text-muted"
      testID="logic-separator-text"
    >
      {logic}
    </Text>
    <Box twClassName="flex-1 h-px bg-border-muted" />
  </Box>
);

/**
 * Finds the matching prerequisite status for a prerequisite
 * Matches by type and activityTypes array comparison
 */
const findPrerequisiteStatus = (
  prerequisite: SnapshotPrerequisiteDto,
  prerequisiteStatuses?: SnapshotPrerequisiteStatusDto[],
): SnapshotPrerequisiteStatusDto | undefined => {
  if (!prerequisiteStatuses) {
    return undefined;
  }

  return prerequisiteStatuses.find(
    (prerequisiteStatus) =>
      prerequisiteStatus.type === prerequisite.type &&
      prerequisiteStatus.title === prerequisite.title,
  );
};

/**
 * SnapshotPrerequisiteList renders multiple SnapshotPrerequisiteItem components with AND/OR logic separators.
 *
 * @example
 * <SnapshotPrerequisiteList
 *   prerequisites={snapshotPrerequisites}
 *   prerequisiteStatuses={eligibilityData?.prerequisites}
 * />
 */
const SnapshotPrerequisiteList: React.FC<SnapshotPrerequisiteListProps> = ({
  prerequisites,
  prerequisiteStatuses,
}) => {
  const { logic, conditions } = prerequisites;

  return (
    <Box testID="snapshot-prerequisite-list">
      {conditions.map((prerequisite, index) => {
        const prerequisiteStatus = findPrerequisiteStatus(
          prerequisite,
          prerequisiteStatuses,
        );
        const isLastItem = index === conditions.length - 1;

        return (
          <React.Fragment
            key={`${prerequisite.type}-${prerequisite.activityTypes.join('-')}-${index}`}
          >
            <SnapshotPrerequisiteItem
              prerequisite={prerequisite}
              satisfied={prerequisiteStatus?.satisfied}
              current={prerequisiteStatus?.current}
              required={prerequisiteStatus?.required}
            />
            {!isLastItem && <LogicSeparator logic={logic} />}
          </React.Fragment>
        );
      })}
    </Box>
  );
};

export default SnapshotPrerequisiteList;
