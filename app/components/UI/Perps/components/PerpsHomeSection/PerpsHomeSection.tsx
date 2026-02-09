import React, { ReactNode } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';

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
   * Color for subtitle text (e.g., Success for profit, Error for loss)
   */
  subtitleColor?: TextColor;
  /**
   * Optional suffix for subtitle (rendered in default color, e.g., "Unrealized PnL")
   */
  subtitleSuffix?: string;
  /**
   * Test ID for subtitle element
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
   * Optional action handler - when provided, shows ">" chevron and makes header row pressable
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
  section: {
    marginBottom: 24,
  },
  headerContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  subtitleColor = TextColor.Alternative,
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
  // Hide section if empty and showWhenEmpty is false
  if (!isLoading && isEmpty && !showWhenEmpty) {
    return null;
  }

  const showAction = onActionPress && !isLoading && !isEmpty;

  // Title row content (pressable when action is available)
  const titleRowContent = (
    <>
      <Text variant={TextVariant.BodyLGMedium} color={TextColor.Default}>
        {title}
      </Text>
      {showAction && (
        <Icon
          name={IconName.MoreHorizontal}
          size={IconSize.Md}
          color={IconColor.Alternative}
        />
      )}
    </>
  );

  return (
    <View style={styles.section} testID={testID}>
      {/* Section Header */}
      <View style={styles.headerContainer}>
        {/* Title row - only this is pressable */}
        {showAction ? (
          <TouchableOpacity style={styles.titleRow} onPress={onActionPress}>
            {titleRowContent}
          </TouchableOpacity>
        ) : (
          <View style={styles.titleRow}>{titleRowContent}</View>
        )}

        {/* Subtitle - NOT pressable */}
        {subtitle && (
          <Text
            variant={TextVariant.BodySM}
            color={subtitleColor}
            testID={subtitleTestID}
          >
            {subtitle}
            {subtitleSuffix && (
              <Text
                variant={TextVariant.BodySM}
                color={TextColor.Alternative}
                testID={subtitleTestID ? `${subtitleTestID}-suffix` : undefined}
              >
                {' '}
                {subtitleSuffix}
              </Text>
            )}
          </Text>
        )}
      </View>

      {/* Section Content */}
      <View style={styles.content}>
        {isLoading ? renderSkeleton() : children}
      </View>
    </View>
  );
};

export default PerpsHomeSection;
