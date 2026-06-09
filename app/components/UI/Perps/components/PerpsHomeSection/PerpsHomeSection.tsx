import React, { ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  FontWeight,
} from '@metamask/design-system-react-native';
import SectionHeader from '../../../../../component-library/components-temp/SectionHeader';
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
   * Optional action handler - when provided, shows "..." icon and makes header row pressable
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

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 0,
  },
  content: {
    // Content styling handled by children
  },
});

/**
 * PerpsHomeSection Component
 *
 * A reusable wrapper for home screen sections that handles:
 * - Loading states with skeletons
 * - Empty states (hide or show based on showWhenEmpty)
 * - Section headers with optional actions
 * - Consistent styling and layout
 *
 * @example
 * ```tsx
 * <PerpsHomeSection
 *   title="Positions"
 *   isLoading={isLoading.positions}
 *   isEmpty={positions.length === 0}
 *   showWhenEmpty={false}
 *   onActionPress={handleCloseAll}
 *   renderSkeleton={() => <PerpsRowSkeleton count={2} />}
 * >
 *   {positions.map(pos => <PerpsCard position={pos} />)}
 * </PerpsHomeSection>
 * ```
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
  const tw = useTailwind();

  // Hide section if empty and showWhenEmpty is false
  if (!isLoading && isEmpty && !showWhenEmpty) {
    return null;
  }

  const showAction = onActionPress && !isLoading && !isEmpty;

  return (
    <Box
      paddingTop={8}
      style={tw.style('mb-6 border-t border-muted')}
      testID={testID}
    >
      {/* Section Header */}
      <View style={styles.headerContainer}>
        <SectionHeader
          title={title}
          justifyContent={showAction ? BoxJustifyContent.Between : undefined}
          endAccessory={
            showAction ? (
              <TouchableOpacity
                testID={PerpsHomeSectionTestIds.ACTION_BUTTON}
                onPress={onActionPress}
              >
                <Icon
                  name={IconName.MoreHorizontal}
                  size={IconSize.Md}
                  color={IconColor.IconDefault}
                />
              </TouchableOpacity>
            ) : undefined
          }
          twClassName="px-0 mb-0"
        />

        {/* Value + muted label: same row as wallet homepage unrealized P&L (8px gap). */}
        {subtitle && subtitleSuffix ? (
          <HomepageSectionUnrealizedPnlRow
            label={subtitleSuffix}
            valueText={subtitle}
            valueColor={subtitleColor}
            paddingHorizontal={0}
            marginTop={1}
            valueTestID={subtitleTestID}
            labelTestID={
              subtitleTestID ? `${subtitleTestID}-suffix` : undefined
            }
          />
        ) : subtitle ? (
          <Box marginTop={1}>
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
      </View>

      {/* Section Content */}
      <View style={styles.content}>
        {isLoading ? renderSkeleton() : children}
      </View>
    </Box>
  );
};

export default PerpsHomeSection;
