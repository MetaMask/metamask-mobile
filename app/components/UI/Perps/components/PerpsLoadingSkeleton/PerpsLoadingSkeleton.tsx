import React from 'react';
import { View, ScrollView } from 'react-native';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './PerpsLoadingSkeleton.styles';

interface PerpsLoadingSkeletonProps {
  testID?: string;
}

/**
 * PerpsLoadingSkeleton - Skeleton UI displayed while Perps connection is initializing
 *
 * This component mimics the structure of PerpsTabView to provide a smooth
 * visual transition when the connection is established. It shows skeleton
 * placeholders for:
 * - Tab control bar (balance and action buttons)
 * - Positions section header
 * - Position cards
 */
const PerpsLoadingSkeleton: React.FC<PerpsLoadingSkeletonProps> = ({
  testID = 'perps-loading-skeleton',
}) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.wrapper} testID={testID}>
      {/* Tab Control Bar Skeleton */}
      <View style={styles.controlBarContainer}>
        <View style={styles.controlBarContent}>
          {/* Balance Section */}
          <View style={styles.balanceSection}>
            <Skeleton width={100} height={14} style={styles.balanceLabel} />
            <Skeleton width={120} height={24} style={styles.balanceValue} />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsSection}>
            <Skeleton width={40} height={40} style={styles.actionButton} />
            <Skeleton width={40} height={40} style={styles.actionButton} />
            <Skeleton width={40} height={40} style={styles.actionButton} />
          </View>
        </View>
      </View>

      {/* Positions Content */}
      <ScrollView style={styles.content} scrollEnabled={false}>
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Skeleton width={80} height={18} style={styles.sectionTitle} />
        </View>

        {/* Position Cards */}
        <View style={styles.positionsList}>
          {/* First Position Card */}
          <View style={styles.positionCard}>
            <View style={styles.positionCardHeader}>
              <View style={styles.positionCardLeft}>
                <Skeleton width={40} height={40} style={styles.positionIcon} />
                <View style={styles.positionInfo}>
                  <Skeleton
                    width={60}
                    height={16}
                    style={styles.positionSymbol}
                  />
                  <Skeleton
                    width={40}
                    height={12}
                    style={styles.positionLeverage}
                  />
                </View>
              </View>
              <View style={styles.positionCardRight}>
                <Skeleton width={80} height={16} style={styles.positionPnl} />
                <Skeleton
                  width={60}
                  height={12}
                  style={styles.positionPercentage}
                />
              </View>
            </View>
          </View>

          {/* Second Position Card */}
          <View style={styles.positionCard}>
            <View style={styles.positionCardHeader}>
              <View style={styles.positionCardLeft}>
                <Skeleton width={40} height={40} style={styles.positionIcon} />
                <View style={styles.positionInfo}>
                  <Skeleton
                    width={60}
                    height={16}
                    style={styles.positionSymbol}
                  />
                  <Skeleton
                    width={40}
                    height={12}
                    style={styles.positionLeverage}
                  />
                </View>
              </View>
              <View style={styles.positionCardRight}>
                <Skeleton width={80} height={16} style={styles.positionPnl} />
                <Skeleton
                  width={60}
                  height={12}
                  style={styles.positionPercentage}
                />
              </View>
            </View>
          </View>

          {/* Third Position Card (partial visibility) */}
          <View style={styles.positionCard}>
            <View style={styles.positionCardHeader}>
              <View style={styles.positionCardLeft}>
                <Skeleton width={40} height={40} style={styles.positionIcon} />
                <View style={styles.positionInfo}>
                  <Skeleton
                    width={60}
                    height={16}
                    style={styles.positionSymbol}
                  />
                  <Skeleton
                    width={40}
                    height={12}
                    style={styles.positionLeverage}
                  />
                </View>
              </View>
              <View style={styles.positionCardRight}>
                <Skeleton width={80} height={16} style={styles.positionPnl} />
                <Skeleton
                  width={60}
                  height={12}
                  style={styles.positionPercentage}
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default PerpsLoadingSkeleton;
