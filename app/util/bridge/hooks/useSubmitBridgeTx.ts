import type {
  MetaMetricsSwapsEventSource,
  QuoteMetadata,
  QuoteResponse,
} from '@metamask/bridge-controller';
import Engine from '../../../core/Engine';
import { useSelector } from 'react-redux';
import { selectShouldUseSmartTransaction } from '../../../selectors/smartTransactionsController';
import { selectSourceWalletAddress } from '../../../selectors/bridge';
import { selectAbTestContext } from '../../../core/redux/slices/bridge';
import { useABTest } from '../../../hooks';
import {
  NUMPAD_QUICK_ACTIONS_AB_KEY,
  NUMPAD_QUICK_ACTIONS_VARIANTS,
} from '../../../components/UI/Bridge/components/GaslessQuickPickOptions/abTestConfig';
import {
  TOKEN_SELECTOR_BALANCE_LAYOUT_AB_KEY,
  TOKEN_SELECTOR_BALANCE_LAYOUT_VARIANTS,
} from '../../../components/UI/Bridge/components/TokenSelectorItem.abTestConfig';
import {
  STICKY_FOOTER_SWAP_LABEL_AB_KEY,
  STICKY_FOOTER_SWAP_LABEL_VARIANTS,
} from '../../../components/UI/TokenDetails/components/abTestConfig';
import { useMemo } from 'react';

export default function useSubmitBridgeTx() {
  const stxEnabled = useSelector(selectShouldUseSmartTransaction);
  const walletAddress = useSelector(selectSourceWalletAddress);
  const abTestContext = useSelector(selectAbTestContext);
  const { variantName: numpadVariantName, isActive: isNumpadAbActive } =
    useABTest(NUMPAD_QUICK_ACTIONS_AB_KEY, NUMPAD_QUICK_ACTIONS_VARIANTS);
  const {
    variantName: tokenSelectorVariantName,
    isActive: isTokenSelectorAbActive,
  } = useABTest(
    TOKEN_SELECTOR_BALANCE_LAYOUT_AB_KEY,
    TOKEN_SELECTOR_BALANCE_LAYOUT_VARIANTS,
  );
  const {
    variantName: stickyFooterVariantName,
    isActive: isStickyFooterAbActive,
  } = useABTest(
    STICKY_FOOTER_SWAP_LABEL_AB_KEY,
    STICKY_FOOTER_SWAP_LABEL_VARIANTS,
  );

  const abTests = abTestContext?.assetsASSETS2493AbtestTokenDetailsLayout
    ? {
        assetsASSETS2493AbtestTokenDetailsLayout:
          abTestContext.assetsASSETS2493AbtestTokenDetailsLayout,
      }
    : undefined;
  const activeAbTests = useMemo(() => {
    const tests: { key: string; value: string }[] = [];

    if (isNumpadAbActive) {
      tests.push({
        key: NUMPAD_QUICK_ACTIONS_AB_KEY,
        value: numpadVariantName,
      });
    }

    if (isTokenSelectorAbActive) {
      tests.push({
        key: TOKEN_SELECTOR_BALANCE_LAYOUT_AB_KEY,
        value: tokenSelectorVariantName,
      });
    }

    if (isStickyFooterAbActive) {
      tests.push({
        key: STICKY_FOOTER_SWAP_LABEL_AB_KEY,
        value: stickyFooterVariantName,
      });
    }

    return tests.length > 0 ? tests : undefined;
  }, [
    isNumpadAbActive,
    numpadVariantName,
    isTokenSelectorAbActive,
    tokenSelectorVariantName,
    isStickyFooterAbActive,
    stickyFooterVariantName,
  ]);

  const submitBridgeTx = async ({
    quoteResponse,
    location,
  }: {
    quoteResponse: QuoteResponse & QuoteMetadata;
    /** The entry point from which the user initiated the swap or bridge */
    location?: MetaMetricsSwapsEventSource;
  }) => {
    if (!walletAddress) {
      throw new Error('Wallet address is not set');
    }

    // check whether quoteResponse is an intent transaction
    if (quoteResponse.quote.intent) {
      return Engine.context.BridgeStatusController.submitIntent({
        quoteResponse,
        accountAddress: walletAddress,
        location,
        abTests,
        activeAbTests,
      });
    }
    return Engine.context.BridgeStatusController.submitTx(
      walletAddress,
      {
        ...quoteResponse,
        approval: quoteResponse.approval ?? undefined,
      },
      stxEnabled,
      undefined, // quotesReceivedContext
      location,
      abTests,
      activeAbTests,
    );
  };

  return { submitBridgeTx };
}
