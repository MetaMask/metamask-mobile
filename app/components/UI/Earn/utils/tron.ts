import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { TRON_RESOURCE } from '../../../../core/Multichain/constants';
import {
  normalizeToDotDecimal,
  toTokenMinimalUnit,
} from '../../../../util/number';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { EARN_EXPERIENCES } from '../constants/experiences';
import type { EarnTokenDetails } from '../types/lending.types';
import type { TronStakeResult, TronUnstakeResult } from './tron-staking-snap';
import { TokenI } from '../../Tokens/types';

interface TronResource {
  symbol?: string;
  balance?: string | number;
}

/**
 * Returns the total staked TRX (sTRX) amount derived from TRON resources.
 * Sums both sTRX Energy and sTRX Bandwidth balances.
 */
export const getStakedTrxTotalFromResources = (
  resources?: TronResource[] | null,
): number => {
  if (!Array.isArray(resources)) return 0;

  const parseNum = (v?: string | number) =>
    typeof v === 'number' ? v : parseFloat(String(v ?? '0').replace(/,/g, ''));

  const strxEnergy = resources.find(
    (a) => a.symbol?.toLowerCase() === TRON_RESOURCE.STRX_ENERGY,
  );
  const strxBandwidth = resources.find(
    (a) => a.symbol?.toLowerCase() === TRON_RESOURCE.STRX_BANDWIDTH,
  );

  return parseNum(strxEnergy?.balance) + parseNum(strxBandwidth?.balance);
};

// True if the user holds any sTRX according to TRON resources.
export const hasStakedTrxPositions = (
  resources?: TronResource[] | null,
): boolean => getStakedTrxTotalFromResources(resources) > 0;

export const buildTronEarnTokenIfEligible = (
  token: TokenI,
  {
    isTrxStakingEnabled,
    isTronEligible,
    stakedBalanceOverride,
  }: {
    isTrxStakingEnabled: boolean;
    isTronEligible: boolean;
    /**
     * Optional override for the token balance, used for flows that operate on
     * staked TRX (sTRX) rather than the liquid TRX balance.
     */
    stakedBalanceOverride?: number | string;
  },
): EarnTokenDetails | undefined => {
  if (!isTrxStakingEnabled || !isTronEligible) {
    return undefined;
  }

  const balanceSource =
    stakedBalanceOverride !== undefined
      ? normalizeToDotDecimal(stakedBalanceOverride)
      : normalizeToDotDecimal(token.balance);

  const balanceMinimalUnit = toTokenMinimalUnit(
    balanceSource,
    token.decimals ?? 0,
  ).toString();

  const experiences = [
    { type: EARN_EXPERIENCES.POOLED_STAKING, apr: '0' as const },
  ];

  return {
    ...token,
    isETH: false,
    balanceMinimalUnit,
    balanceFormatted:
      stakedBalanceOverride !== undefined
        ? String(stakedBalanceOverride)
        : (token.balance ?? '0'),
    balanceFiat: token.balanceFiat ?? '0',
    tokenUsdExchangeRate: 0,
    experiences,
    experience: experiences[0],
  } as EarnTokenDetails;
};

type TronStakingNavigationResult =
  | TronStakeResult
  | TronUnstakeResult
  | null
  | undefined;

type TronStakingAction = 'stake' | 'unstake';

const TRON_STAKING_COPY: Record<
  TronStakingAction,
  {
    successTitleKey: string;
    successDescriptionKey: string;
    errorTitleKey: string;
  }
> = {
  stake: {
    successTitleKey: 'stake.tron.stake_completed',
    successDescriptionKey: 'stake.tron.stake_completed_description',
    errorTitleKey: 'stake.tron.stake_failed',
  },
  unstake: {
    successTitleKey: 'stake.tron.unstake_completed',
    successDescriptionKey: 'stake.tron.unstake_completed_description',
    errorTitleKey: 'stake.tron.unstake_failed',
  },
};

export const handleTronStakingNavigationResult = (
  navigation: NavigationProp<ParamListBase>,
  result: TronStakingNavigationResult,
  action: TronStakingAction,
) => {
  const copy = TRON_STAKING_COPY[action];

  if (result?.valid && (!result.errors || result.errors.length === 0)) {
    navigation.goBack();
    requestAnimationFrame(() => {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
        params: {
          title: strings(copy.successTitleKey),
          description: strings(copy.successDescriptionKey),
          type: 'success',
          closeOnPrimaryButtonPress: true,
        },
      });
    });
  } else {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
      params: {
        title: strings(copy.errorTitleKey),
        description: result?.errors?.join('\n') ?? '',
        type: 'error',
      },
    });
  }
};
