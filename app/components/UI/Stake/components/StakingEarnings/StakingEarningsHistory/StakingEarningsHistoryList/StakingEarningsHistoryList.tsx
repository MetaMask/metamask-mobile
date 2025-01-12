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
}

const StakingEarningsHistoryList = ({
  earnings,
  ticker,
  filterByGroupLabel,
}: StakingEarningsHistoryListProps) => {
  const { colors } = useTheme();
  const styles = styleSheet();

  return (
    <View style={styles.stakingEarningsHistoryListContainer}>
      {earnings.length > 0 ? (
        <>
          <Label variant={TextVariant.BodyMDBold} color={colors.text.default}>
            Payout history
          </Label>
          {earnings.map((earning, index) =>
            !filterByGroupLabel || earning.groupLabel === filterByGroupLabel ? (
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
            ) : null,
          )}
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
