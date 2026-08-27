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
import I18n, { strings } from '../../../../../../locales/i18n';
import {
  getFormattedAmountChange,
  getFormattedPercentageChange,
} from '../../../../../component-library/components-temp/Price/AggregatedPercentage/utils';
import { TEST_NETWORK_IDS } from '../../../../../constants/network';
import Engine from '../../../../../core/Engine';
import { selectAccountGroupBalanceForEmptyState } from '../../../../../selectors/assets/balances';
import { selectEvmChainId } from '../../../../../selectors/networkController';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { useFormatters } from '../../../../hooks/useFormatters';
import type { HeroData } from '../../BalanceBreakdown/types';

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
  const accountGroupBalance = useSelector(
    selectAccountGroupBalanceForEmptyState,
  );
  const balanceOpacity = useSharedValue(1);
  const locale = I18n.locale;
  const animatedBalanceStyle = useAnimatedStyle(() => ({
    opacity: balanceOpacity.value,
  }));
  const isLoading = hero.status === 'loading';
  const isCurrentNetworkTestnet = TEST_NETWORK_IDS.includes(selectedChainId);
  const shouldShowEmptyState =
    hero.status === 'ready' &&
    hero.totalFiat === 0 &&
    accountGroupBalance?.totalBalanceInUserCurrency === 0 &&
    !hero.isPartiallyLoaded &&
    !hero.hasErroredSlice &&
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
        : getFormattedPercentageChange(hero.delta.percent * 100, locale),
    [hero.delta?.percent, locale],
  );
  const accessibilityHint = strings(
    privacyMode
      ? 'balance_breakdown.show_balance'
      : 'balance_breakdown.hide_balance',
  );
  const accessibilityLabel = privacyMode
    ? accessibilityHint
    : [
        displayBalance,
        amountText?.trim(),
        percentText,
        hero.delta ? strings('asset_overview.chart_time_period.1d') : undefined,
      ]
        .filter(Boolean)
        .join(', ');
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
    accessibilityHint,
    accessibilityLabel,
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
