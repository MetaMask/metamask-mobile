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
   * The prerequisites data containing logic operator and conditions
   */
  prerequisites: DropPrerequisitesDto;

  /**
   * Optional status for each prerequisite
   * When provided, progress data will be displayed
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
 * @example
 * <DropPrerequisiteList
 *   prerequisites={dropPrerequisites}
 *   prerequisiteStatuses={eligibilityData?.prerequisites}
 * />
 */
const DropPrerequisiteList: React.FC<DropPrerequisiteListProps> = ({
  prerequisites,
  prerequisiteStatuses,
}) => {
  const { logic, conditions } = prerequisites;

  const renderItem: ListRenderItem<DropPrerequisiteDto> = useCallback(
    ({ item, index }) => (
      <DropPrerequisiteItem
        prerequisite={item}
        status={prerequisiteStatuses?.[index]}
      />
    ),
    [prerequisiteStatuses],
  );

  const keyExtractor = useCallback(
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

export default DropPrerequisiteList;
