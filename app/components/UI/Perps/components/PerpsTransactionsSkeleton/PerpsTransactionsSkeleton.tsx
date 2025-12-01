import React from 'react';
import { View } from 'react-native';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './PerpsTransactionsSkeleton.styles';

interface PerpsTransactionsSkeletonProps {
  testID?: string;
}

/**
 * PerpsTransactionsSkeleton - Loading skeleton for Perps transactions list
 *
 * Mimics the structure of the actual transaction list with:
 * - Section headers
 * - Transaction items with token logo, content, and right side content
 */
const PerpsTransactionsSkeleton: React.FC<PerpsTransactionsSkeletonProps> = ({
  testID = 'perps-transactions-skeleton',
}) => {
  const { styles } = useStyles(styleSheet, {});

  const renderSkeletonTransactionItem = (
    sectionIndex: number,
    itemIndex: number,
  ) => (
    <View
      style={styles.transactionItem}
      key={`skeleton-transaction-${sectionIndex}-${itemIndex}`}
    >
      {/* Token logo skeleton */}
      <View style={styles.tokenIconContainer}>
        <Skeleton width={36} height={36} style={styles.tokenIcon} />
      </View>

      {/* Transaction content skeleton */}
      <View style={styles.transactionContent}>
        <Skeleton width={120} height={16} style={styles.transactionTitle} />
        <Skeleton width={80} height={12} style={styles.transactionSubtitle} />
      </View>

      {/* Right content skeleton */}
      <View style={styles.rightContent}>
        <Skeleton width={60} height={14} style={styles.rightContentSkeleton} />
      </View>
    </View>
  );

  const renderSkeletonSection = (sectionIndex: number) => (
    <View key={`skeleton-section-${sectionIndex}`}>
      {/* Section header skeleton */}
      <View style={styles.sectionHeader}>
        <Skeleton
          width={100}
          height={16}
          style={styles.sectionHeaderSkeleton}
        />
      </View>

      {/* Transaction items skeleton */}
      {Array.from({ length: 3 }, (_, itemIndex) =>
        renderSkeletonTransactionItem(sectionIndex, itemIndex),
      )}
    </View>
  );

  return (
    <View style={styles.container} testID={testID}>
      {/* Render 2 skeleton sections to mimic typical transaction list */}
      {Array.from({ length: 2 }, (_, sectionIndex) =>
        renderSkeletonSection(sectionIndex),
      )}
    </View>
  );
};

export default PerpsTransactionsSkeleton;
