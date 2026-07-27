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
import { selectCardFeatureFlag } from '../../../../selectors/featureFlagController/card';
import { safeToChecksumAddress } from '../../../../util/address';
import {
  awaitTransactionConfirmed,
  type AwaitTransactionConfirmedMessenger,
} from '../../../../core/Engine/controllers/card-controller/utils/awaitTransactionConfirmed';
import type {
  CardCreateResult,
  CardFundingSourceResult,
  CardSmartContractWriteParams,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import {
  encodeSmartContractWrite,
  immersveNetworkToCaipChainId,
  withApproveAmount,
} from '../util/immersveFunding';
import { getCardProviderErrorMessage } from '../util/getCardProviderErrorMessage';
import { useEnsureCardNetworkExists } from './useEnsureCardNetworkExists';

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
  const cardFeatureFlag = useSelector(selectCardFeatureFlag);
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
      try {
        const account = selectAccountByScope('eip155:0');
        const address = safeToChecksumAddress(account?.address);
        if (!address) {
          throw new Error('No account found for funding');
        }

        const caipChainId = immersveNetworkToCaipChainId(
          cardFeatureFlag?.immersve?.network,
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

        setState({ isLoading: false, error: null });
        return txHash;
      } catch (e) {
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
      cardFeatureFlag?.immersve?.network,
      ensureNetworkExists,
      TransactionController,
    ],
  );

  const createCard = useCallback(
    async (fundingSourceId: string): Promise<CardCreateResult> => {
      setState({ isLoading: true, error: null });
      try {
        const result = await getController().createCard(fundingSourceId);
        setState({ isLoading: false, error: null });
        return result;
      } catch (e) {
        setState({ isLoading: false, error: getCardProviderErrorMessage(e) });
        throw e;
      }
    },
    [],
  );

  return {
    ...state,
    createFundingSource,
    executeFunding,
    createCard,
  };
};
