import React from 'react';
import { View } from 'react-native';
import Label from '../../../../../../../component-library/components/Form/Label';
import Text from '../../../../../../../component-library/components/Texts/Text';
import { TextVariant } from '../../../../../../../component-library/components/Texts/Text/Text.types';
import { useTheme } from '../../../../../../../util/theme';
import styleSheet from './StakingEarningHistoryList.styles';

interface StakingEarningsHistoryListProps {
  earnings: StakingEarningsHistoryListData[];
  symbol: string;
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
  symbol,
  filterByGroupLabel,
}: StakingEarningsHistoryListProps) => {
  const { colors } = useTheme();
  const styles = styleSheet();
  return (
    <View style={styles.stakingEarningsHistoryListContainer}>
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
                  + {earning.amount} {symbol}
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
    </View>
  );
};

export default StakingEarningsHistoryList;
