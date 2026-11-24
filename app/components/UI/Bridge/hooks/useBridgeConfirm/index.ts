import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  selectDestToken,
  selectSourceAmount,
  selectSourceToken,
  incrementBridgeBalanceRefreshKey,
  resetBridgeTokenInputs,
  resetHardwareWalletsSwaps,
  setIsSubmittingTx,
  updateHardwareWalletsSwaps,
} from '../../../../../core/redux/slices/bridge';
import Routes from '../../../../../constants/navigation/Routes';
import useSubmitBridgeTx from '../../../../../util/bridge/hooks/useSubmitBridgeTx';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import {
  MetaMetricsSwapsEventSource,
  type QuoteResponse,
} from '@metamask/bridge-controller';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import { isHardwareAccount } from '../../../../../util/address';
import { buildStartPayload } from '../../../HardwareWallet/Swaps/HardwareWalletsSwaps.state';
import { isSameChainSwap } from '../../../HardwareWallet/Swaps/flowStrategy';
import {
  type PostTradeBottomSheetParams,
  PostTradeStatus,
} from '../../components/PostTradeBottomSheet/PostTradeBottomSheet.types';
import Engine from '../../../../../core/Engine';
import { withPostTradeNotificationSuppression } from '../../utils/postTradeNotifications';
import { usePostTradePromptResolver } from '../../../../Views/SocialLeaderboard/PostTradeShareBottomSheet/usePostTradePromptResolver';
import { resolveSwapSocialPostTrade } from '../../components/PostTradeBottomSheet/resolveSwapPostTradeShare';
import { prefetchQuoteTokens } from '../../../../Views/SocialLeaderboard/PostTradeShareBottomSheet/quoteTokens';
import { selectIsSocialV1Enabled } from '../../../../../selectors/featureFlagController/socialV1';
import { selectProfileControllerLinkedEvmAddress } from '../../../../../selectors/profileController';
import { resolveMoneyAccountOperation } from '../../../../../util/bridge/money-operations';

interface Params {
  activeQuote?: QuoteResponse | null;
  location: MetaMetricsSwapsEventSource;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

export const useBridgeConfirm = ({
  activeQuote,
  location,
  transactionActiveAbTests,
}: Params) => {
  const dispatch = useDispatch();
  const navigation = useNavigation<AppNavigationProp>();
  const { submitBridgeTx } = useSubmitBridgeTx();
  const walletAddress = useSelector(selectSourceWalletAddress);
  const isHardwareWalletAccount = walletAddress
    ? Boolean(isHardwareAccount(walletAddress))
    : false;
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const resolvePostTradePrompt = usePostTradePromptResolver();
  const isSocialV1Enabled = useSelector(selectIsSocialV1Enabled);
  const linkedEvmAddress = useSelector(selectProfileControllerLinkedEvmAddress);
  const canOfferSocialShare = isSocialV1Enabled && Boolean(linkedEvmAddress);

  // Only the social feed loads the quote-token list, and the share check needs
  // it. Load it here so a swap made without visiting the feed can still share.
  useEffect(() => {
    if (canOfferSocialShare) {
      prefetchQuoteTokens();
    }
  }, [canOfferSocialShare]);

  const handleConfirm = async () => {
    if (!activeQuote || !walletAddress) {
      return;
    }

    if (isHardwareWalletAccount) {
      dispatch(setIsSubmittingTx(true));
      try {
        dispatch(resetHardwareWalletsSwaps());
        const isSwap = isSameChainSwap(sourceToken, destToken);
        dispatch(
          updateHardwareWalletsSwaps(
            buildStartPayload(activeQuote, { isSwap }),
          ),
        );
        navigation.navigate(Routes.BRIDGE.ROOT, {
          screen: Routes.BRIDGE.HARDWARE_WALLETS_SWAPS,
          params: {
            submissionParams: {
              quoteResponse: activeQuote,
              location,
              transactionActiveAbTests,
              postTradeModalParams: {
                sourceAmount:
                  sourceAmount ?? activeQuote.quote.src.normalizedAmount,
                destAmount: activeQuote.quote.dest.normalizedAmount,
                sourceToken,
                destToken,
              },
            },
          },
        });
      } finally {
        dispatch(setIsSubmittingTx(false));
      }
      return;
    }

    const modalTokenParams = {
      sourceAmount: sourceAmount ?? activeQuote.quote.src.normalizedAmount,
      destAmount: activeQuote.quote.dest.normalizedAmount,
      sourceToken,
      destToken,
    };
    let modalParams: PostTradeBottomSheetParams = {
      ...modalTokenParams,
      status: PostTradeStatus.InProgress,
    };
    // Decided at submit, like Quick Buy, so the count is read before the swap.
    const socialPostTrade = resolveSwapSocialPostTrade({
      prompt: resolvePostTradePrompt('swaps'),
      sourceToken,
      destToken,
      sourceUsd: activeQuote.quote.src.usd,
      sourceAmount: activeQuote.quote.src.normalizedAmount,
      destUsd: activeQuote.quote.dest.usd,
      destAmount: activeQuote.quote.dest.normalizedAmount,
    });

    try {
      dispatch(setIsSubmittingTx(true));

      const submittedTransaction = await withPostTradeNotificationSuppression(
        () =>
          submitBridgeTx({
            quoteResponse: activeQuote,
            location,
            transactionActiveAbTests,
          }),
      );
      const transactionHash =
        submittedTransaction &&
        'hash' in submittedTransaction &&
        typeof submittedTransaction.hash === 'string'
          ? submittedTransaction.hash
          : undefined;

      modalParams = {
        ...modalTokenParams,
        status: PostTradeStatus.InProgress,
        transactionMetaId: submittedTransaction?.id,
        transactionHash,
        socialPostTrade,
      };

      dispatch(resetBridgeTokenInputs());
      Engine.context.BridgeController?.resetState?.();
      dispatch(incrementBridgeBalanceRefreshKey());
    } catch (error) {
      console.error('Error submitting bridge tx', error);
      modalParams = {
        ...modalTokenParams,
        status: PostTradeStatus.Failed,
      };
    } finally {
      dispatch(setIsSubmittingTx(false));
      if (resolveMoneyAccountOperation(sourceToken, destToken)) {
        navigation.navigate(
          Routes.HOME_TABS,
          {
            screen: Routes.MONEY.ROOT,
            params: { screen: Routes.MONEY.HOME },
          },
          { pop: true },
        );
      } else {
        navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
          screen: Routes.BRIDGE.MODALS.POST_TRADE_MODAL,
          params: modalParams,
        });
      }
    }
  };

  return handleConfirm;
};
