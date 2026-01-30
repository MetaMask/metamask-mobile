import { NavigationProp, ParamListBase } from '@react-navigation/native';
import BigNumber from 'bignumber.js';
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
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

interface TronResource {
  symbol?: string;
  balance?: string | number;
}

/**
 * Returns the total staked TRX (sTRX) amount derived from TRON resources.
 * Sums both sTRX Energy and sTRX Bandwidth balances.
 * Uses BigNumber to avoid floating-point precision errors.
 */
export const getStakedTrxTotalFromResources = (
  resources?: TronResource[] | null,
): number => {
  if (!Array.isArray(resources)) return 0;

  const strxEnergy = resources.find(
    (a) => a.symbol?.toLowerCase() === TRON_RESOURCE.STRX_ENERGY,
  );
  const strxBandwidth = resources.find(
    (a) => a.symbol?.toLowerCase() === TRON_RESOURCE.STRX_BANDWIDTH,
  );

  // Use BigNumber to prevent floating-point precision errors
  // e.g., 65.48463 + 65.48463 should equal 130.96926, not 130.96926000000002
  const energyBalance = strxEnergy?.balance ?? 0;
  const bandwidthBalance = strxBandwidth?.balance ?? 0;

  // Remove commas from string values (e.g., "1,000.50" -> "1000.50")
  const cleanEnergy =
    typeof energyBalance === 'string'
      ? energyBalance.replace(/,/g, '')
      : energyBalance;
  const cleanBandwidth =
    typeof bandwidthBalance === 'string'
      ? bandwidthBalance.replace(/,/g, '')
      : bandwidthBalance;

  const energyBN = new BigNumber(cleanEnergy);
  const bandwidthBN = new BigNumber(cleanBandwidth);

  return energyBN.plus(bandwidthBN).toNumber();
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

  // Truncate to token decimals to prevent "too many decimal places" error
  // from toTokenMinimalUnit when floating-point arithmetic produces extra decimals
  const decimals = token.decimals ?? 6;
  const truncatedBalance = new BigNumber(balanceSource)
    .decimalPlaces(decimals, BigNumber.ROUND_DOWN)
    .toFixed();

  const balanceMinimalUnit = toTokenMinimalUnit(
    truncatedBalance,
    decimals,
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

/**
 * Maps known TRON error codes to localization keys.
 * Falls back to the raw error message for unrecognized errors.
 */
const TRON_ERROR_LOCALIZATION_KEYS: Record<string, string> = {
  InsufficientBalance: 'stake.tron.errors.insufficient_balance',
};

export const getLocalizedErrorMessage = (errors?: string[]): string => {
  if (!errors || errors.length === 0) {
    return '';
  }

  const localizedMessages = errors.map((error) => {
    const localizationKey = TRON_ERROR_LOCALIZATION_KEYS[error];
    return localizationKey ? strings(localizationKey) : error;
  });

  return localizedMessages.join('\n');
};

export const handleTronStakingNavigationResult = (
  navigation: NavigationProp<ParamListBase>,
  result: TronStakingNavigationResult,
  action: TronStakingAction,
  accountId?: string,
) => {
  const copy = TRON_STAKING_COPY[action];

  if (result?.valid && (!result.errors || result.errors.length === 0)) {
    // Refreshes the multichain balance after successful stake/unstake
    // to make sure that the asset overview displays the updated staked balance right away
    if (accountId) {
      const { MultichainBalancesController } = Engine.context;
      MultichainBalancesController.updateBalance(accountId).catch(
        (error: Error) => {
          Logger.error(
            error,
            `[Tron ${action}] Failed to refresh multichain balance`,
          );
        },
      );
    }

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
        description: getLocalizedErrorMessage(result?.errors),
        type: 'error',
      },
    });
  }
};
