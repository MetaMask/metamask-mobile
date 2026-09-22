import React from 'react';
import {
  BannerBase,
  ButtonSize,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useBridgeQuoteDataContext } from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import useIsInsufficientBalance from '../../../hooks/useInsufficientBalance';
import { useInsufficientNativeReserveError } from '../../../hooks/useInsufficientNativeReserveError';
import { WARNING_BANNER_TW_CLASSNAME } from '../SwapsBanners.constants';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';
import { useSwapsBannersContext } from '../SwapsBannersContext';
import { useBridgeSession } from '../../../hooks/useBridgeSession';
import { isArcTokenUSDC } from '../../../../../../enablement/assets/arc';

/**
 * Warns when the entered amount would spend the native balance that has to stay
 * in the account, and offers to lower it to the maximum swappable amount.
 */
export const InsufficientNativeReserveBanner = () => {
  const { sourceAmount, sourceToken, walletAddress, onAdjustSourceAmount } =
    useSwapsBannersContext();
  const { latestSourceBalance } = useBridgeSession();
  const latestSourceAtomicBalance = latestSourceBalance?.atomicBalance;
  const { activeQuote } = useBridgeQuoteDataContext();

  const hasInsufficientBalance = useIsInsufficientBalance({
    amount: sourceAmount,
    token: sourceToken,
    latestAtomicBalance: latestSourceAtomicBalance,
  });

  const insufficientNativeReserveError = useInsufficientNativeReserveError({
    amount: sourceAmount,
    token: sourceToken,
    latestAtomicBalance: latestSourceAtomicBalance,
    walletAddress,
    activeQuote,
  });

  if (!insufficientNativeReserveError || hasInsufficientBalance) {
    return null;
  }

  const { maxSwappableNativeBalance, minimumNativeBalanceToBeKeptInAccount } =
    insufficientNativeReserveError;
  const isArcUSDC = sourceToken ? isArcTokenUSDC(sourceToken) : false;
  const titleKey = isArcUSDC
    ? 'bridge.insufficient_native_reserve_title_arc'
    : 'bridge.insufficient_native_reserve_title';
  const messageKey = isArcUSDC
    ? 'bridge.insufficient_native_reserve_message_arc'
    : 'bridge.insufficient_native_reserve_message';

  return (
    <BannerBase
      testID={SwapsBannersSelectorsIDs.INSUFFICIENT_NATIVE_RESERVE}
      twClassName={WARNING_BANNER_TW_CLASSNAME}
      startAccessory={
        <Icon
          name={IconName.Warning}
          color={IconColor.WarningDefault}
          size={IconSize.Lg}
        />
      }
      title={strings(titleKey, {
        ticker: sourceToken?.symbol,
      })}
      description={strings(messageKey, {
        ticker: sourceToken?.symbol,
        minimumReserve: minimumNativeBalanceToBeKeptInAccount,
        maxSwappable: maxSwappableNativeBalance,
      })}
      actionButtonLabel={strings('bridge.insufficient_native_reserve_cta')}
      actionButtonOnPress={() =>
        onAdjustSourceAmount(maxSwappableNativeBalance)
      }
      actionButtonProps={{
        size: ButtonSize.Sm,
        twClassName: 'mt-1.5',
      }}
    />
  );
};
