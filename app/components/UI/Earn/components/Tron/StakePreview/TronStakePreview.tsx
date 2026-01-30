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
import { TRON_RESOURCE } from '../../../../../../core/Multichain/constants';
import { selectTronResourcesBySelectedAccountGroup } from '../../../../../../selectors/assets/assets-list';
import type { ComputeFeeResult } from '../../../types/tron-staking.types';

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

// Temporary fixed APR until staking yield is provided
const TRON_STAKING_APR = 0.0335; // 3.35%

const TronStakePreview = ({
  fee,
  stakeAmount,
  mode = 'stake',
}: TronStakePreviewProps) => {
  const tw = useTailwind();

  const tronResources = useSelector(selectTronResourcesBySelectedAccountGroup);

  const { strxEnergy, strxBandwidth } = React.useMemo(() => {
    let strxEnergy, strxBandwidth;
    for (const asset of tronResources) {
      switch (asset.symbol.toLowerCase()) {
        case TRON_RESOURCE.STRX_ENERGY:
          strxEnergy = asset;
          break;
        case TRON_RESOURCE.STRX_BANDWIDTH:
          strxBandwidth = asset;
          break;
        default:
          break;
      }
    }
    return {
      strxEnergy,
      strxBandwidth,
    };
  }, [tronResources]);

  // Use BigNumber to prevent floating-point precision errors
  // e.g., 65.48463 + 65.48463 should equal 130.96926, not 130.96926000000002
  const parseBN = (v?: string | number) =>
    new BigNumber(String(v ?? '0').replace(/,/g, ''));

  const totalStakedTrxBN = React.useMemo(
    () => parseBN(strxEnergy?.balance).plus(parseBN(strxBandwidth?.balance)),
    [strxEnergy?.balance, strxBandwidth?.balance],
  );

  const feeItem: ComputeFeeResult[0] | undefined = Array.isArray(fee)
    ? fee[0]
    : fee;

  const estimatedAnnualReward = React.useMemo(() => {
    const inputAmountBN = new BigNumber(stakeAmount ?? '0');

    let totalForRewardsBN = totalStakedTrxBN;

    if (mode === 'stake') {
      totalForRewardsBN = totalStakedTrxBN.plus(inputAmountBN);
    } else if (mode === 'unstake') {
      totalForRewardsBN = BigNumber.max(
        totalStakedTrxBN.minus(inputAmountBN),
        0,
      );
    }

    if (totalForRewardsBN.lte(0)) {
      return '';
    }

    const reward = totalForRewardsBN.multipliedBy(TRON_STAKING_APR);
    const rewardRounded = reward.decimalPlaces(3, BigNumber.ROUND_HALF_UP);

    return `${rewardRounded.toNumber().toLocaleString(undefined, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    })} TRX`;
  }, [stakeAmount, totalStakedTrxBN, mode]);

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
