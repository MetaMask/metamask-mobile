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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 12,
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

  const headerContent = (
    <>
      <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
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
      {showAction ? (
        <TouchableOpacity style={styles.header} onPress={onActionPress}>
          {headerContent}
        </TouchableOpacity>
      ) : (
        <View style={styles.header}>{headerContent}</View>
      )}

      {/* Section Content */}
      <View style={styles.content}>
        {isLoading ? renderSkeleton() : children}
      </View>
    </View>
  );
};

export default PerpsHomeSection;
