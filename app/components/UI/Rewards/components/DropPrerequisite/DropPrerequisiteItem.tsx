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
  DropPrerequisiteDto,
  DropPrerequisiteStatusDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { getIconName } from '../../utils/formatUtils';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

/**
 * Props for the DropPrerequisiteItem component
 */
interface DropPrerequisiteItemProps {
  /**
   * The prerequisite data to display
   */
  prerequisite: DropPrerequisiteDto;

  /**
   * Status information for this prerequisite (satisfied, current, required)
   */
  status?: DropPrerequisiteStatusDto;

  /**
   * Whether to hide the status badge on the right side
   * @default false
   */
  hideStatus?: boolean;
}

/**
 * DropPrerequisiteItem displays a single prerequisite with icon, title, description, and progress badge.
 *
 * Layout: [Icon] | Title + Description | [Progress Badge showing current/required]
 *
 * @example
 * <DropPrerequisiteItem
 *   prerequisite={prerequisite}
 *   status={{ satisfied: true, current: 5, required: 5 }}
 * />
 */
const DropPrerequisiteItem: React.FC<DropPrerequisiteItemProps> = ({
  prerequisite,
  status,
  hideStatus = false,
}) => {
  const tw = useTailwind();
  return (
    <Box twClassName="gap-2" testID="drop-prerequisite-item">
      <Box flexDirection={BoxFlexDirection.Row} gap={3}>
        {/* Prerequisite Icon */}
        <Icon
          name={getIconName(prerequisite.iconName)}
          size={IconSize.Lg}
          testID="drop-prerequisite-item-icon"
        />

        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName="text-text-default flex-1"
          testID="drop-prerequisite-item-title"
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
            testID="drop-prerequisite-item-progress-badge"
            startAccessory={
              <Icon
                name={getIconName(prerequisite.iconName)}
                size={IconSize.Sm}
                twClassName="text-icon-alternative"
                testID="drop-prerequisite-item-icon"
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

export default DropPrerequisiteItem;
