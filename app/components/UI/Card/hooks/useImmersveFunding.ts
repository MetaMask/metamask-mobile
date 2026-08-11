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
import { selectCardImmersveConfig } from '../../../../selectors/featureFlagController/card';
import { safeToChecksumAddress } from '../../../../util/address';
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
  encodeSmartContractWrite,
  immersveNetworkToCaipChainId,
  withApproveAmount,
} from '../util/immersveFunding';
import { getCardProviderErrorMessage } from '../util/getCardProviderErrorMessage';
import { withCardProvider } from '../util/metrics';
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

export const useImmersveFunding = () => {
  const { TransactionController } = Engine.context;
  const { ensureNetworkExists } = useEnsureCardNetworkExists();
  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );
  const immersveConfig = useSelector(selectCardImmersveConfig);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [state, setState] = useState<FundingState>({
    isLoading: false,
    error: null,
  });

  const createFundingSource =
    useCallback(async (): Promise<CardFundingSourceResult> => {
      setState({ isLoading: true, error: null });
      try {
        const result = await getController().createFundingSource();
        setState({ isLoading: false, error: null });
        return result;
      } catch (e) {
        setState({ isLoading: false, error: getCardProviderErrorMessage(e) });
        throw e;
      }
    }, []);

  const executeFunding = useCallback(
    async (
      write: CardSmartContractWriteParams,
      approveAmountBaseUnits?: string,
    ): Promise<string> => {
      setState({ isLoading: true, error: null });
      const metricsProps = withCardProvider(CardProviderIds.Immersve, {
        step: 'approve',
      });
      try {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.CARD_FUNDING_PROCESS_STARTED)
            .addProperties(metricsProps)
            .build(),
        );

        const account = selectAccountByScope('eip155:0');
        const address = safeToChecksumAddress(account?.address);
        if (!address) {
          throw new Error('No account found for funding');
        }

        const caipChainId = immersveNetworkToCaipChainId(
          immersveConfig?.network,
        );
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
        const isUserCancelled =
          errorMessage.includes('User denied') ||
          errorMessage.includes('User rejected') ||
          errorMessage.includes('User cancelled') ||
          errorMessage.includes('User canceled');

        if (isUserCancelled) {
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
          'useImmersveFunding: funding execution failed',
        );
        setState({ isLoading: false, error: getCardProviderErrorMessage(e) });
        throw e;
      }
    },
    [
      selectAccountByScope,
      immersveConfig?.network,
      ensureNetworkExists,
      TransactionController,
      trackEvent,
      createEventBuilder,
    ],
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
    createCard,
  };
};
