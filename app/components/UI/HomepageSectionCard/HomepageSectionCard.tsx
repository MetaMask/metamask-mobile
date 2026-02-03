import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import { useStyles } from '../../hooks/useStyles';
import styleSheet from './HomepageSectionCard.styles';
import type { HomepageSectionCardProps } from './HomepageSectionCard.types';

/**
 * HomepageSectionCard Component
 *
 * A reusable card wrapper for homepage sections that provides:
 * - Section header with title and optional "View All" navigation
 * - Dark rounded card container for content
 * - Loading states with skeleton rendering
 * - Empty state handling
 *
 * Based on the Perps feature card pattern.
 *
 * @example
 * ```tsx
 * <HomepageSectionCard
 *   title="Tokens"
 *   onViewAll={() => navigate('TokensFullView')}
 *   isLoading={isLoading}
 *   isEmpty={tokens.length === 0}
 *   renderSkeleton={() => <TokenListSkeleton />}
 * >
 *   <TokenList tokens={tokens} />
 * </HomepageSectionCard>
 * ```
 */
const HomepageSectionCard: React.FC<HomepageSectionCardProps> = ({
  title,
  onViewAll,
  isLoading = false,
  isEmpty = false,
  showWhenEmpty = false,
  renderSkeleton,
  children,
  testID,
}) => {
  const { styles } = useStyles(styleSheet, {});

  // Hide section if empty and showWhenEmpty is false
  if (!isLoading && isEmpty && !showWhenEmpty) {
    return null;
  }

  const showChevron = !!onViewAll;

  // Header content
  const headerContent = (
    <View style={styles.headerRow}>
      <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
        {title}
      </Text>
      {showChevron && (
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Sm}
          color={IconColor.Alternative}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container} testID={testID}>
      {/* Section Header */}
      <View style={styles.headerContainer}>
        {onViewAll ? (
          <TouchableOpacity onPress={onViewAll}>
            {headerContent}
          </TouchableOpacity>
        ) : (
          headerContent
        )}
      </View>

      {/* Card Container */}
      <View style={styles.cardContainer}>
        <View style={styles.cardContent}>
          {isLoading && renderSkeleton ? renderSkeleton() : children}
        </View>
      </View>
    </View>
  );
};

export default HomepageSectionCard;
