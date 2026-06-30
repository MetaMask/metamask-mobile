import React, { ReactNode } from 'react';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
  SectionHeader,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  IconColor,
} from '@metamask/design-system-react-native';
import HomepageSectionUnrealizedPnlRow from '../../../../Views/Homepage/components/HomepageSectionUnrealizedPnlRow';
import { PerpsHomeSectionTestIds } from './PerpsHomeSection.testIds';

export interface PerpsHomeSectionProps {
  /**
   * Section title
   */
  title: string;
  /**
   * Optional subtitle text (e.g., P&L value and percentage)
   */
  subtitle?: string;
  /**
   * Color for subtitle value text (e.g., Success for profit, Error for loss)
   */
  subtitleColor?: TextColor;
  /**
   * Optional suffix for subtitle (rendered in muted color, e.g., "Unrealized P&L")
   */
  subtitleSuffix?: string;
  /**
   * Test ID for subtitle value element
   */
  subtitleTestID?: string;
  /**
   * Whether the section is loading
   */
  isLoading: boolean;
  /**
   * Whether the section has no data
   */
  isEmpty: boolean;
  /**
   * Whether to show the section when empty (default: false)
   * - true: Always show section (e.g., Trending Markets)
   * - false: Hide section when empty (e.g., Positions, Orders)
   */
  showWhenEmpty?: boolean;
  /**
   * Optional action handler - when provided, shows "..." icon on the right of the header
   */
  onActionPress?: () => void;
  /**
   * Function to render skeleton loading state
   */
  renderSkeleton: () => ReactNode;
  /**
   * Section content
   */
  children: ReactNode;
  /**
   * Optional test ID
   */
  testID?: string;
}

/**
 * PerpsHomeSection Component
 *
 * A reusable wrapper for home screen sections that handles:
 * - Loading states with skeletons
 * - Empty states (hide or show based on showWhenEmpty)
 * - Section headers with optional actions
 * - Consistent styling and layout
 */
const PerpsHomeSection: React.FC<PerpsHomeSectionProps> = ({
  title,
  subtitle,
  subtitleColor = TextColor.TextDefault,
  subtitleSuffix,
  subtitleTestID,
  isLoading,
  isEmpty,
  showWhenEmpty = false,
  onActionPress,
  renderSkeleton,
  children,
  testID,
}) => {
  if (!isLoading && isEmpty && !showWhenEmpty) {
    return null;
  }

  const showAction = onActionPress && !isLoading && !isEmpty;

  return (
    <Box testID={testID}>
      <SectionHeader
        title={title}
        twClassName={showAction ? 'pb-1 justify-between pr-3' : 'pb-1'}
        endAccessory={
          showAction ? (
            <ButtonIcon
              iconName={IconName.MoreHorizontal}
              iconProps={{ color: IconColor.IconAlternative }}
              size={ButtonIconSize.Md}
              onPress={onActionPress}
              testID={PerpsHomeSectionTestIds.ACTION_BUTTON}
            />
          ) : undefined
        }
      />
      {/* TODO: place this into SectionHeader children when available */}
      {subtitle && subtitleSuffix ? (
        <HomepageSectionUnrealizedPnlRow
          label={subtitleSuffix}
          valueText={subtitle}
          valueColor={subtitleColor}
          paddingHorizontal={4}
          valueTestID={subtitleTestID}
          labelTestID={subtitleTestID ? `${subtitleTestID}-suffix` : undefined}
        />
      ) : subtitle ? (
        <Box paddingHorizontal={4}>
          <Text
            variant={TextVariant.BodyMd}
            color={subtitleColor}
            fontWeight={FontWeight.Medium}
            testID={subtitleTestID}
          >
            {subtitle}
          </Text>
        </Box>
      ) : null}
      {isLoading ? renderSkeleton() : children}
    </Box>
  );
};

export default PerpsHomeSection;
