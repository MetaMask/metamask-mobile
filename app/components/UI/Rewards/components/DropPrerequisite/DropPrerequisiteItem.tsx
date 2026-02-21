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
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import type {
  DropPrerequisiteDto,
  DropPrerequisiteStatusDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { getIconName } from '../../utils/formatUtils';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

/**
 * Shared two-row layout for prerequisite items (content and skeleton).
 *
 * Row 1: [icon] [title (flex-1)] [endAccessory]
 * Row 2: [w-9 spacer] [subtitle (flex-1)]
 */
interface PrerequisiteItemLayoutProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  endAccessory?: React.ReactNode;
  subtitle: React.ReactNode;
  testID?: string;
}

const PrerequisiteItemLayout: React.FC<PrerequisiteItemLayoutProps> = ({
  icon,
  title,
  endAccessory,
  subtitle,
  testID,
}) => (
  <Box twClassName="gap-2" testID={testID}>
    <Box
      flexDirection={BoxFlexDirection.Row}
      gap={3}
      twClassName="items-center"
    >
      {icon}
      {title}
      {endAccessory}
    </Box>
    <Box flexDirection={BoxFlexDirection.Row}>
      <Box twClassName="w-9" />
      {subtitle}
    </Box>
  </Box>
);

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

  /**
   * Whether to render skeleton placeholders instead of content
   * @default false
   */
  loading?: boolean;
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
  loading = false,
}) => {
  const tw = useTailwind();

  if (loading) {
    return (
      <PrerequisiteItemLayout
        testID="drop-prerequisite-item-skeleton"
        icon={
          <Skeleton height={32} width={32} style={tw.style('rounded-full')} />
        }
        title={<Skeleton height={20} style={tw.style('flex-1 rounded')} />}
        endAccessory={
          <Skeleton height={20} width={64} style={tw.style('rounded-lg')} />
        }
        subtitle={<Skeleton height={20} style={tw.style('flex-1 rounded')} />}
      />
    );
  }

  return (
    <PrerequisiteItemLayout
      testID="drop-prerequisite-item"
      icon={
        <Icon
          name={getIconName(prerequisite.iconName)}
          size={IconSize.Lg}
          testID="drop-prerequisite-item-icon"
        />
      }
      title={
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName="text-text-default flex-1"
          testID="drop-prerequisite-item-title"
        >
          {prerequisite.title}
        </Text>
      }
      endAccessory={
        !hideStatus ? (
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
        ) : undefined
      }
      subtitle={
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          twClassName="text-alternative text-left flex-1"
        >
          {prerequisite.description}
        </Text>
      }
    />
  );
};

export default DropPrerequisiteItem;
