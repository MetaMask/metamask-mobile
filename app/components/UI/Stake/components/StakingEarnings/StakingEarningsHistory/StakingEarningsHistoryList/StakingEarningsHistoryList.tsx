import React, { useCallback } from 'react';
import { View } from 'react-native';
import Label from '../../../../../../../component-library/components/Form/Label';
import Text from '../../../../../../../component-library/components/Texts/Text';
import { TextVariant } from '../../../../../../../component-library/components/Texts/Text/Text.types';
import { useTheme } from '../../../../../../../util/theme';
import styleSheet from './StakingEarningsHistoryList.styles';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { strings } from '../../../../../../../../locales/i18n';
import { StakingEarningsHistoryListProps } from './StakingEarningsHistoryList.types';

const StakingEarningsHistoryList = ({
  earnings,
  filterByGroupLabel,
}: StakingEarningsHistoryListProps) => {
  const { colors } = useTheme();
  const styles = styleSheet();

  const renderEarningsList = useCallback(() => {
    let lastGroupHeader: string | null = null;
    return earnings.map((earning, index) => {
      const isFirstEarningInGroup = earning.groupHeader !== lastGroupHeader;
      lastGroupHeader = earning.groupHeader;
      const isGroupHeaderVisible =
        earning.groupHeader.length > 0 && isFirstEarningInGroup;
      if (!filterByGroupLabel || earning.groupLabel === filterByGroupLabel) {
        return (
          <View key={`earning-history-list-item-${index}`}>
            {isGroupHeaderVisible && (
              <View style={styles.lineItemGroupHeaderContainer}>
                <Label
                  variant={TextVariant.BodyMDMedium}
                  color={colors.text.default}
                >
                  {earning.groupHeader}
                </Label>
              </View>
            )}
            <View style={styles.lineItemContainer}>
              <View style={styles.leftLineItemBox}>
                <Label
                  variant={TextVariant.BodyMDMedium}
                  color={colors.text.default}
                >
                  {earning.label}
                </Label>
              </View>
              <View style={styles.rightLineItemContainer}>
                <View style={styles.rightLineItemBox}>
                  <Label
                    variant={TextVariant.BodyMDMedium}
                    color={colors.success.default}
                  >
                    + {earning.amount} {earning.ticker}
                  </Label>
                </View>
                <View>
                  <Text
                    variant={TextVariant.BodySM}
                    color={colors.text.alternative}
                  >
                    {earning.amountSecondaryText}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      }
      return null;
    });
  }, [earnings, filterByGroupLabel, styles, colors]);

  const renderLoadingSkeleton = useCallback(
    () => (
      <SkeletonPlaceholder>
        {Array.from({ length: 7 }).map((_, index) => (
          <SkeletonPlaceholder.Item
            key={`earning-history-skeleton-item-${index}`}
            width={343}
            height={42}
            borderRadius={6}
            marginBottom={10}
          />
        ))}
      </SkeletonPlaceholder>
    ),
    [],
  );

  return (
    <View style={styles.stakingEarningsHistoryListContainer}>
      {earnings ? (
        <>
          <Label variant={TextVariant.BodyMDBold} color={colors.text.default}>
            {strings('stake.earnings_history_list_title')}
          </Label>
          {renderEarningsList()}
        </>
      ) : (
        renderLoadingSkeleton()
      )}
    </View>
  );
};

export default StakingEarningsHistoryList;
