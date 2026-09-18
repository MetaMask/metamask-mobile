import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import TransactionTypes from '../../../../core/TransactionTypes';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { selectCardHomeData } from '../../../../selectors/cardController';
import { selectCardImmersveConfig } from '../../../../selectors/featureFlagController/card';
import {
  areAddressesEqual,
  safeToChecksumAddress,
} from '../../../../util/address';
import {
  awaitTransactionConfirmed,
  type AwaitTransactionConfirmedMessenger,
} from '../../../../core/Engine/controllers/card-controller/utils/awaitTransactionConfirmed';
import {
  CardProviderIds,
  type CardCreateResult,
  type CardFundingSourceResult,
  type CardSmartContractWriteParams,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import {
  buildImmersveApproveWrite,
  encodeSmartContractWrite,
  immersveNetworkToCaipChainId,
  immersveNetworkToFundingToken,
  withApproveAmount,
} from '../util/immersveFunding';
import { getCardProviderErrorMessage } from '../util/getCardProviderErrorMessage';
import { withCardProvider } from '../util/metrics';
import { resolveCardFundingAddress } from '../util/resolveCardFundingAddress';
import { useEnsureCardNetworkExists } from './useEnsureCardNetworkExists';
import { UserCancelledError } from './useCardDelegation';

interface FundingState {
  isLoading: boolean;
  error: string | null;
}

function getController() {
  const controller = Engine.context?.CardController;
  if (!controller) {
    throw new Error('CardController not initialized');
  }
  return controller;
}

function getImmersveFundingErrorContext(
  method: string,
  data: Record<string, unknown>,
) {
  return {
    tags: { feature: 'card', provider: 'immersve' },
    context: {
      name: 'useImmersveFunding',
      data: { method, ...data },
    },
  };
}

function isUserCancelledError(errorMessage: string): boolean {
  return (
    errorMessage.includes('User denied') ||
    errorMessage.includes('User rejected') ||
    errorMessage.includes('User cancelled') ||
    errorMessage.includes('User canceled')
  );
}

interface UseImmersveFundingOptions {
  /** SIWE / route-param funding wallet; wins over Card Home and selection. */
  fundingAddress?: string | null;
}

export const useImmersveFunding = (options: UseImmersveFundingOptions = {}) => {
  const { TransactionController } = Engine.context;
  const { ensureNetworkExists } = useEnsureCardNetworkExists();
  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );
  const cardHomeData = useSelector(selectCardHomeData);
  const immersveConfig = useSelector(selectCardImmersveConfig);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [state, setState] = useState<FundingState>({
    isLoading: false,
    error: null,
  });

  const resolveFundingFromAddress = useCallback((): string => {
    const selected = selectAccountByScope('eip155:0');
    const resolved = resolveCardFundingAddress({
      preferredAddress: options.fundingAddress,
      primaryFundingWalletAddress:
        cardHomeData?.primaryFundingAsset?.walletAddress,
      selectedEvmAddress: selected?.address,
    });
    const address = safeToChecksumAddress(resolved);
    if (!address) {
      throw new Error('No account found for funding');
    }

    const ownedAccount =
      Engine.context.AccountsController.getAccountByAddress(address);
    if (!ownedAccount) {
      throw new Error('Funding account is not available in this wallet');
    }

    // Match Add funds: confirmation UI and subsequent selection must use the
    // card funding wallet, not whichever EVM account happens to be active.
    if (!areAddressesEqual(address, selected?.address ?? '')) {
      Engine.setSelectedAddress(address);
    }

    return address;
  }, [
    options.fundingAddress,
    cardHomeData?.primaryFundingAsset?.walletAddress,
    selectAccountByScope,
  ]);

  const createFundingSource =
    useCallback(async (): Promise<CardFundingSourceResult> => {
      setState({ isLoading: true, error: null });
      try {
        const result = await getController().createFundingSource();
        setState({ isLoading: false, error: null });
        return result;
      } catch (e) {
        // Provider already reports API failures via reportAndMap.
        setState({ isLoading: false, error: getCardProviderErrorMessage(e) });
        throw e;
      }
    }, []);

  const submitApprove = useCallback(
    async ({
      write,
      approveAmountBaseUnits,
      step,
      method,
      extraMetrics,
    }: {
      write: CardSmartContractWriteParams;
      approveAmountBaseUnits?: string;
      step: string;
      method: string;
      extraMetrics?: Record<string, unknown>;
    }): Promise<string> => {
      setState({ isLoading: true, error: null });
      const metricsProps = withCardProvider(CardProviderIds.Immersve, {
        step,
        ...extraMetrics,
      });
      const network = immersveConfig?.network;
      let caipChainId: string | undefined;
      try {
        caipChainId = immersveNetworkToCaipChainId(network);
        trackEvent(
          createEventBuilder(MetaMetricsEvents.CARD_FUNDING_PROCESS_STARTED)
            .addProperties(metricsProps)
            .build(),
        );

        const address = resolveFundingFromAddress();

        const networkClientId = await ensureNetworkExists(caipChainId);
        const writeToEncode = approveAmountBaseUnits
          ? withApproveAmount(write, approveAmountBaseUnits)
          : write;
        const data = encodeSmartContractWrite(writeToEncode);

        const { txHash } = await awaitTransactionConfirmed({
          messenger:
            Engine.controllerMessenger as unknown as AwaitTransactionConfirmedMessenger,
          submit: () =>
            TransactionController.addTransaction(
              {
                from: address,
                to: write.contractAddress,
                data,
              },
              {
                networkClientId,
                origin: TransactionTypes.MMM_CARD,
                isInternal: true,
                type: TransactionType.tokenMethodApprove,
                deviceConfirmedOn: WalletDevice.MM_MOBILE,
                requireApproval: true,
              },
            ),
        });

        trackEvent(
          createEventBuilder(MetaMetricsEvents.CARD_FUNDING_PROCESS_COMPLETED)
            .addProperties(metricsProps)
            .build(),
        );

        setState({ isLoading: false, error: null });
        return txHash;
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);

        if (isUserCancelledError(errorMessage)) {
          trackEvent(
            createEventBuilder(
              MetaMetricsEvents.CARD_FUNDING_PROCESS_USER_CANCELED,
            )
              .addProperties(metricsProps)
              .build(),
          );
          setState({ isLoading: false, error: null });
          throw new UserCancelledError(errorMessage);
        }

        trackEvent(
          createEventBuilder(MetaMetricsEvents.CARD_FUNDING_PROCESS_FAILED)
            .addProperties(metricsProps)
            .build(),
        );
        Logger.error(
          e as Error,
          getImmersveFundingErrorContext(method, {
            step,
            network,
            chainId: caipChainId,
            contractMethod: write.method,
          }),
        );
        setState({ isLoading: false, error: getCardProviderErrorMessage(e) });
        throw e;
      }
    },
    [
      resolveFundingFromAddress,
      immersveConfig?.network,
      ensureNetworkExists,
      TransactionController,
      trackEvent,
      createEventBuilder,
    ],
  );

  const executeFunding = useCallback(
    async (
      write: CardSmartContractWriteParams,
      approveAmountBaseUnits?: string,
    ): Promise<string> =>
      submitApprove({
        write,
        approveAmountBaseUnits,
        step: 'approve',
        method: 'executeFunding',
      }),
    [submitApprove],
  );

  /**
   * Builds a local ERC-20 approve write from Immersve config. Used when
   * Immersve's spending prerequisites do not supply a `smart_contract_write`
   * (revoke and post-revoke re-approval).
   */
  const buildApproveWrite = useCallback(
    (amountBaseUnits: string): CardSmartContractWriteParams => {
      const spenderAddress = immersveConfig?.spenderAddress;
      if (!spenderAddress) {
        throw new Error('Immersve spender address is not configured');
      }
      const { tokenAddress } = immersveNetworkToFundingToken(
        immersveConfig?.network,
      );
      return buildImmersveApproveWrite({
        tokenAddress,
        spenderAddress,
        amountBaseUnits,
      });
    },
    [immersveConfig?.network, immersveConfig?.spenderAddress],
  );

  const revokeFunding = useCallback(
    async (): Promise<string> =>
      submitApprove({
        write: buildApproveWrite('0'),
        step: 'revoke',
        method: 'revokeFunding',
        extraMetrics: { is_revoke: true },
      }),
    [buildApproveWrite, submitApprove],
  );

  const createCard = useCallback(
    async (fundingSourceId: string): Promise<CardCreateResult> => {
      setState({ isLoading: true, error: null });
      // Approve owns the Funding Process STARTED→COMPLETED pair. createCard only
      // emits FAILED so successful journeys are not double-counted as Completed.
      const metricsProps = withCardProvider(CardProviderIds.Immersve, {
        step: 'create_card',
      });
      try {
        const result = await getController().createCard(fundingSourceId);
        setState({ isLoading: false, error: null });
        return result;
      } catch (e) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.CARD_FUNDING_PROCESS_FAILED)
            .addProperties(metricsProps)
            .build(),
        );
        // Provider already reports API failures via reportAndMap.
        setState({ isLoading: false, error: getCardProviderErrorMessage(e) });
        throw e;
      }
    },
    [trackEvent, createEventBuilder],
  );

  return {
    ...state,
    createFundingSource,
    executeFunding,
    revokeFunding,
    buildApproveWrite,
    createCard,
  };
};
