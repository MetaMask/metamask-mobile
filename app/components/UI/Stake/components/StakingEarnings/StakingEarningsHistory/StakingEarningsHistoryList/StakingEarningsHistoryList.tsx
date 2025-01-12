import React from 'react';
import { View } from 'react-native';
import Label from '../../../../../../../component-library/components/Form/Label';
import Text from '../../../../../../../component-library/components/Texts/Text';
import { TextVariant } from '../../../../../../../component-library/components/Texts/Text/Text.types';
import { useTheme } from '../../../../../../../util/theme';
import styleSheet from './StakingEarningsHistoryList.styles';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

interface StakingEarningsHistoryListProps {
  earnings: StakingEarningsHistoryListData[];
  ticker: string;
  filterByGroupLabel?: string;
}

export interface StakingEarningsHistoryListData {
  label: string;
  amount: string;
  amountUsd: string;
  groupLabel: string;
  groupHeader: string;
}

const StakingEarningsHistoryList = ({
  earnings,
  ticker,
  filterByGroupLabel,
}: StakingEarningsHistoryListProps) => {
  const { colors } = useTheme();
  const styles = styleSheet();
  let lastGroupHeader: string | null = null;
  return (
    <View style={styles.stakingEarningsHistoryListContainer}>
      {earnings.length > 0 ? (
        <>
          <Label variant={TextVariant.BodyMDBold} color={colors.text.default}>
            Payout history
          </Label>
          {earnings.map((earning, index) => {
            const isFirstEarningInGroup =
              earning.groupHeader !== lastGroupHeader;
            lastGroupHeader = earning.groupHeader;
            if (
              !filterByGroupLabel ||
              earning.groupLabel === filterByGroupLabel
            ) {
              return (
                <View key={index}>
                  {earning.groupHeader && isFirstEarningInGroup && (
                    <View style={styles.lineItemGroupHeaderContainer}>
                      <Label
                        variant={TextVariant.BodyMDMedium}
                        color={colors.text.default}
                      >
                        {earning.groupHeader}
                      </Label>
                    </View>
                  )}
                  <View style={styles.lineItemContainer} key={index}>
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
                          + {earning.amount} {ticker}
                        </Label>
                      </View>
                      <View>
                        <Text
                          variant={TextVariant.BodySM}
                          color={colors.text.alternative}
                        >
                          {earning.amountUsd} USD
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            }
            return null;
          })}
        </>
      ) : (
        <SkeletonPlaceholder>
          {Array.from({ length: 7 }).map((_, index) => (
            <SkeletonPlaceholder.Item
              key={index}
              width={343}
              height={42}
              borderRadius={6}
              marginBottom={10}
            />
          ))}
        </SkeletonPlaceholder>
      )}
    </View>
  );
};

export default StakingEarningsHistoryList;
