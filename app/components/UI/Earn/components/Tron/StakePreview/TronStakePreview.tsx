import React from 'react';
import { useSelector } from 'react-redux';
import { Animated, Easing } from 'react-native';
import BigNumber from 'bignumber.js';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { selectTronSpecialAssetsBySelectedAccountGroup } from '../../../../../../selectors/assets/assets-list';
import type { ComputeFeeResult } from '../../../types/tron-staking.types';
import useTronStakeApy from '../../../hooks/useTronStakeApy';

export interface TronStakePreviewProps {
  fee?: ComputeFeeResult | ComputeFeeResult[0];
  stakeAmount?: string;
  /**
   * Mode indicates whether we are previewing a stake or an unstake action.
   * Defaults to 'stake' to preserve existing behavior.
   */
  mode?: 'stake' | 'unstake';
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="mt-1"
  >
    <Text variant={TextVariant.BodyMd}>{label}</Text>
    <Box>{typeof value === 'string' ? <Text>{value}</Text> : value}</Box>
  </Box>
);

const TronStakePreview = ({
  fee,
  stakeAmount,
  mode = 'stake',
}: TronStakePreviewProps) => {
  const tw = useTailwind();

  const { totalStakedTrx } = useSelector(
    selectTronSpecialAssetsBySelectedAccountGroup,
  );

  const { apyDecimal } = useTronStakeApy();

  const feeItem: ComputeFeeResult[0] | undefined = Array.isArray(fee)
    ? fee[0]
    : fee;

  const estimatedAnnualReward = React.useMemo(() => {
    if (!apyDecimal) {
      return '';
    }

    const stakingApr = new BigNumber(apyDecimal).dividedBy(100);

    const inputAmount = new BigNumber(stakeAmount || '0');

    if (inputAmount.isNaN()) {
      return '';
    }

    const baseStaked = new BigNumber(totalStakedTrx);

    const totalForRewards =
      mode === 'stake'
        ? baseStaked.plus(inputAmount)
        : mode === 'unstake'
          ? BigNumber.max(baseStaked.minus(inputAmount), 0)
          : baseStaked;

    if (totalForRewards.lte(0)) {
      return '';
    }

    const reward = totalForRewards.multipliedBy(stakingApr);
    const rewardRounded = reward.decimalPlaces(3, BigNumber.ROUND_HALF_UP);

    return `${rewardRounded.toNumber().toLocaleString(undefined, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    })} TRX`;
  }, [stakeAmount, totalStakedTrx, mode, apyDecimal]);

  const translateY = React.useRef(new Animated.Value(40)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View
      style={[
        tw.style('w-full'),
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Box
        twClassName="w-full bg-default pl-6 pr-6 rounded-lg"
        style={tw.style()}
      >
        {mode === 'stake' && (
          <Row
            label={strings('stake.tron.estimated_annual_reward')}
            value={estimatedAnnualReward}
          />
        )}
        {mode === 'stake' && (
          <Row
            label={strings('stake.tron.trx_locked_for')}
            value={strings('stake.tron.trx_locked_for_minimum_time')}
          />
        )}
        {mode === 'unstake' && (
          <Row
            label={strings('stake.tron.trx_released_in')}
            value={strings('stake.tron.trx_released_in_minimum_time')}
          />
        )}
        <Row
          label={strings('stake.tron.fee')}
          value={feeItem ? `${feeItem.asset.amount} ${feeItem.asset.unit}` : ''}
        />
      </Box>
    </Animated.View>
  );
};

export default TronStakePreview;
