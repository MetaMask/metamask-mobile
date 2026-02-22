import React from 'react';
import { useSelector } from 'react-redux';
import { Animated, Easing } from 'react-native';
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

  const parseNum = (v?: string | number) =>
    typeof v === 'number' ? v : parseFloat(String(v ?? '0').replace(/,/g, ''));

  const strxEnergyValue = parseNum(strxEnergy?.balance);
  const strxBandwidthValue = parseNum(strxBandwidth?.balance);
  const totalStakedTrx = (strxEnergyValue || 0) + (strxBandwidthValue || 0);

  const feeItem: ComputeFeeResult[0] | undefined = Array.isArray(fee)
    ? fee[0]
    : fee;

  const estimatedAnnualReward = React.useMemo(() => {
    const inputAmount = stakeAmount ? Number(stakeAmount) : 0;
    const baseStaked = Number.isNaN(totalStakedTrx) ? 0 : totalStakedTrx;
    const stake = Number.isNaN(inputAmount) ? 0 : inputAmount;

    let totalForRewards = baseStaked;

    if (mode === 'stake') {
      totalForRewards = baseStaked + stake;
    } else if (mode === 'unstake') {
      totalForRewards = Math.max(baseStaked - stake, 0);
    }

    if (totalForRewards <= 0) {
      return '';
    }

    const reward = totalForRewards * TRON_STAKING_APR;
    const rewardRounded = Math.round(reward * 1000) / 1000;

    return `${rewardRounded.toLocaleString(undefined, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    })} TRX`;
  }, [stakeAmount, totalStakedTrx, mode]);

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
