import React, { useCallback } from 'react';
import { FlatList, ListRenderItem } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import type {
  SnapshotPrerequisiteDto,
  SnapshotPrerequisitesDto,
  SnapshotPrerequisiteStatusDto,
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
  <Box twClassName="flex-row items-center py-4" testID="logic-separator">
    <Box twClassName="flex-1 h-px bg-border-muted" />
    <Text
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      twClassName="mx-4 text-alternative"
      testID="logic-separator-text"
    >
      {logic}
    </Text>
    <Box twClassName="flex-1 h-px bg-border-muted" />
  </Box>
);

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

  const renderItem: ListRenderItem<SnapshotPrerequisiteDto> = useCallback(
    ({ item, index }) => (
      <SnapshotPrerequisiteItem
        prerequisite={item}
        status={prerequisiteStatuses?.[index]}
      />
    ),
    [prerequisiteStatuses],
  );

  const keyExtractor = useCallback(
    (item: SnapshotPrerequisiteDto, index: number) =>
      `${item.type}-${item.activityTypes.join('-')}-${index}`,
    [],
  );

  const ItemSeparator = useCallback(
    () => <LogicSeparator logic={logic} />,
    [logic],
  );

  return (
    <Box testID="snapshot-prerequisite-list">
      <FlatList
        data={conditions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={ItemSeparator}
        scrollEnabled={false}
      />
    </Box>
  );
};

export default SnapshotPrerequisiteList;
