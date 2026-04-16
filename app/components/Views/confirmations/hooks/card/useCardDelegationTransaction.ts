import { useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import Engine from '../../../../../core/Engine';
import TransactionTypes from '../../../../../core/TransactionTypes';
import Logger from '../../../../../util/Logger';
import { safeToChecksumAddress } from '../../../../../util/address';
import { toTokenMinimalUnit } from '../../../../../util/number';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { useCardSDK } from '../../../../UI/Card/sdk';
import { useEnsureCardNetworkExists } from '../../../../UI/Card/hooks/useEnsureCardNetworkExists';
import { buildDelegationTokenList } from '../../../../UI/Card/util/buildTokenList';
import { BAANX_MAX_LIMIT } from '../../../../UI/Card/constants';
import type { CardFundingToken } from '../../../../UI/Card/types';
import { setDelegationFlow } from '../../../../../core/redux/slices/card';
import { useConfirmNavigation } from '../useConfirmNavigation';
import { ConfirmationLoader } from '../../components/confirm/confirm-component';

export interface PrepareAndNavigateParams {
  flow: 'onboarding' | 'manage' | 'enable';
  token?: CardFundingToken | null;
  canChangeToken?: boolean;
}

/**
 * Hook to prepare a cardDelegation transaction and navigate to the
 * CardDelegationInfo confirmation screen.
 *
 * Replaces the old SpendingLimit navigation pattern. Instead of navigating
 * to a custom screen, this hook:
 * 1. Resolves the token (uses provided token or fetches the default)
 * 2. Encodes an ERC-20 approve call with full allowance (BAANX_MAX_LIMIT)
 * 3. Adds the transaction to the approval queue (requireApproval: true)
 * 4. Stores delegation flow state in Redux
 * 5. Navigates to the confirmations screen where CardDelegationInfo renders
 */
export function useCardDelegationTransaction() {
  const { sdk } = useCardSDK();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { ensureNetworkExists } = useEnsureCardNetworkExists();
  const { navigateToConfirmation } = useConfirmNavigation();
  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Fetches delegation settings and returns the first available token.
   * Used when no token is provided by the caller (e.g. onboarding flow).
   */
  const getDefaultToken =
    useCallback(async (): Promise<CardFundingToken | null> => {
      if (!sdk) return null;

      const delegationSettings = await sdk.getDelegationSettings();
      const tokens = buildDelegationTokenList({
        delegationSettings,
        getSupportedTokensByChainId: (chainId) =>
          (sdk.getSupportedTokensByChainId(chainId) ?? []) as {
            address?: string;
            symbol?: string;
            name?: string;
          }[],
      });

      return tokens[0] ?? null;
    }, [sdk]);

  /**
   * Prepares an EVM cardDelegation transaction and navigates to the
   * confirmations screen.
   */
  const prepareAndNavigate = useCallback(
    async ({
      flow,
      token: providedToken,
      canChangeToken = true,
    }: PrepareAndNavigateParams) => {
      if (!sdk) {
        throw new Error('Card SDK not available');
      }

      setIsLoading(true);

      // Navigate immediately so the skeleton shows while we do async work
      navigateToConfirmation({ loader: ConfirmationLoader.CardDelegation });

      try {
        // Resolve token
        let token = providedToken ?? null;
        if (!token) {
          token = await getDefaultToken();
        }
        if (!token) {
          throw new Error('No token available for delegation');
        }
        if (!token.delegationContract) {
          throw new Error('Missing token delegation contract');
        }

        const tokenAddress = token.stagingTokenAddress || token.address;
        if (!tokenAddress) {
          throw new Error('Missing token address');
        }

        // Get EVM account address
        const userAccount = selectAccountByScope('eip155:0');
        const address = safeToChecksumAddress(userAccount?.address);
        if (!address) {
          throw new Error('No EVM account found');
        }

        // Ensure the card network exists in the user's network list
        const networkClientId = await ensureNetworkExists(
          token.caipChainId ?? '',
        );

        // Encode ERC-20 approve with full allowance as default.
        // The user can change the limit inside CardDelegationInfo via
        // updateTransaction before confirming.
        const amountInMinimalUnits = toTokenMinimalUnit(
          BAANX_MAX_LIMIT,
          token.decimals ?? 18,
        ).toString();

        const transactionData = sdk.encodeApproveTransaction(
          token.delegationContract,
          amountInMinimalUnits,
        );

        // Add transaction to the approval queue
        await Engine.context.TransactionController.addTransaction(
          {
            from: address,
            to: tokenAddress,
            data: transactionData,
          },
          {
            networkClientId,
            origin: TransactionTypes.MMM_CARD,
            type: TransactionType.cardDelegation,
            deviceConfirmedOn: WalletDevice.MM_MOBILE,
            requireApproval: true,
          },
        );

        // Store flow metadata in Redux so CardDelegationInfo can read it
        dispatch(
          setDelegationFlow({
            flow,
            canChangeToken,
            selectedToken: token,
          }),
        );
      } catch (error) {
        Logger.error(
          error as Error,
          'useCardDelegationTransaction: Failed to prepare delegation',
        );
        // Go back from the skeleton screen since setup failed
        navigation.goBack();
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [
      sdk,
      getDefaultToken,
      selectAccountByScope,
      ensureNetworkExists,
      dispatch,
      navigateToConfirmation,
      navigation,
    ],
  );

  return {
    prepareAndNavigate,
    isLoading,
  };
}
