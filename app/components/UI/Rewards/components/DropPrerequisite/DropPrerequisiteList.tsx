import React, { useCallback } from 'react';
import { FlatList, ListRenderItem } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import type {
  DropPrerequisiteDto,
  DropPrerequisitesDto,
  DropPrerequisiteStatusDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import DropPrerequisiteItem from './DropPrerequisiteItem';

/**
 * Props for the DropPrerequisiteList component
 */
interface DropPrerequisiteListProps {
  /**
   * The prerequisites data containing logic operator and conditions.
   * Used as the fallback data source when prerequisiteStatuses are not available.
   */
  prerequisites: DropPrerequisitesDto;

  /**
   * Optional statuses for each prerequisite.
   * Each status carries its own embedded prerequisite definition with localized
   * title and description, making it the preferred data source when available.
   */
  prerequisiteStatuses?: DropPrerequisiteStatusDto[];
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
 * DropPrerequisiteList renders multiple DropPrerequisiteItem components with AND/OR logic separators.
 *
 * When prerequisiteStatuses are available, uses the embedded prerequisite from each status
 * for correct matching (with localized title/description). Falls back to the drop's
 * prerequisites conditions when statuses are not yet loaded.
 *
 * @example
 * <DropPrerequisiteList
 *   prerequisites={dropPrerequisites}
 *   prerequisiteStatuses={eligibility?.prerequisiteStatuses}
 * />
 */
const DropPrerequisiteList: React.FC<DropPrerequisiteListProps> = ({
  prerequisites,
  prerequisiteStatuses,
}) => {
  const { logic, conditions } = prerequisites;

  // When statuses are available, render from them (each carries its own prerequisite)
  const renderStatusItem: ListRenderItem<DropPrerequisiteStatusDto> =
    useCallback(
      ({ item }) => (
        <DropPrerequisiteItem prerequisite={item.prerequisite} status={item} />
      ),
      [],
    );

  // Fallback: render from drop conditions without progress data
  const renderConditionItem: ListRenderItem<DropPrerequisiteDto> = useCallback(
    ({ item }) => <DropPrerequisiteItem prerequisite={item} />,
    [],
  );

  const statusKeyExtractor = useCallback(
    (item: DropPrerequisiteStatusDto, index: number) =>
      `${item.prerequisite.type}-${item.prerequisite.activityTypes.join('-')}-${index}`,
    [],
  );

  const conditionKeyExtractor = useCallback(
    (item: DropPrerequisiteDto, index: number) =>
      `${item.type}-${item.activityTypes.join('-')}-${index}`,
    [],
  );

  const ItemSeparator = useCallback(
    () => <LogicSeparator logic={logic} />,
    [logic],
  );

  return (
    <Box testID="drop-prerequisite-list">
      {prerequisiteStatuses ? (
        <FlatList
          data={prerequisiteStatuses}
          renderItem={renderStatusItem}
          keyExtractor={statusKeyExtractor}
          ItemSeparatorComponent={ItemSeparator}
          scrollEnabled={false}
        />
      ) : (
        <FlatList
          data={conditions}
          renderItem={renderConditionItem}
          keyExtractor={conditionKeyExtractor}
          ItemSeparatorComponent={ItemSeparator}
          scrollEnabled={false}
        />
      )}
    </Box>
  );
};

export default DropPrerequisiteList;
