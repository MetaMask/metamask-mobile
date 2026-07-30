import { useCallback, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { TextColor } from '@metamask/design-system-react-native';
import {
  getFormattedAmountChange,
  getFormattedPercentageChange,
} from '../../../../../component-library/components-temp/Price/AggregatedPercentage/utils';
import { TEST_NETWORK_IDS } from '../../../../../constants/network';
import Engine from '../../../../../core/Engine';
import { selectEvmChainId } from '../../../../../selectors/networkController';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { useFormatters } from '../../../../hooks/useFormatters';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { HeroData } from '../../../BalanceBreakdown/types';

const getDeltaColor = (
  privacyMode: boolean,
  amount: number,
  percent?: number,
) => {
  if (privacyMode) return TextColor.TextAlternative;

  const change = percent ?? amount;
  if (change > 0) return TextColor.SuccessDefault;
  if (change < 0) return TextColor.ErrorDefault;
  return TextColor.TextAlternative;
};

export function useHomepageBalanceBreakdownHero(hero: HeroData) {
  const { PreferencesController } = Engine.context;
  const { formatCurrency } = useFormatters();
  const privacyMode = useSelector(selectPrivacyMode);
  const selectedChainId = useSelector(selectEvmChainId);
  const balanceOpacity = useSharedValue(1);
  const animatedBalanceStyle = useAnimatedStyle(() => ({
    opacity: balanceOpacity.value,
  }));
  const isLoading = hero.status === 'loading';
  const isCurrentNetworkTestnet = TEST_NETWORK_IDS.includes(selectedChainId);
  const shouldShowEmptyState =
    hero.status === 'ready' &&
    hero.totalFiat === 0 &&
    !hero.isPartiallyLoaded &&
    !isCurrentNetworkTestnet;
  const displayBalance =
    hero.status === 'error' || hero.status === 'ineligible'
      ? '—'
      : formatCurrency(hero.totalFiat, hero.userCurrency);
  const amountText = useMemo(
    () =>
      hero.delta
        ? getFormattedAmountChange(hero.delta.amount, hero.userCurrency)
        : undefined,
    [hero.delta, hero.userCurrency],
  );
  const percentText = useMemo(
    () =>
      hero.delta?.percent === undefined
        ? undefined
        : getFormattedPercentageChange(hero.delta.percent * 100, 'en-US'),
    [hero.delta?.percent],
  );
  const deltaColor = hero.delta
    ? getDeltaColor(Boolean(privacyMode), hero.delta.amount, hero.delta.percent)
    : TextColor.TextAlternative;

  const togglePrivacy = useCallback(() => {
    PreferencesController.setPrivacyMode(!privacyMode);
  }, [PreferencesController, privacyMode]);

  useEffect(() => {
    cancelAnimation(balanceOpacity);

    if (hero.isPartiallyLoaded) {
      balanceOpacity.value = withRepeat(
        withTiming(0.6, { duration: 900 }),
        -1,
        true,
      );
    } else {
      balanceOpacity.value = 1;
    }

    return () => cancelAnimation(balanceOpacity);
  }, [balanceOpacity, hero.isPartiallyLoaded]);

  return {
    amountText,
    animatedBalanceStyle,
    deltaColor,
    displayBalance,
    isLoading,
    percentText,
    privacyMode,
    shouldShowEmptyState,
    togglePrivacy,
  };
}
