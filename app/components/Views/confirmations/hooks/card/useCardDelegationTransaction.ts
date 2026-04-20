import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { useEnsureCardNetworkExists } from '../../../../UI/Card/hooks/useEnsureCardNetworkExists';
import {
  BAANX_MAX_LIMIT,
  isEvmChain,
  isSolanaChain,
} from '../../../../UI/Card/constants';
import type { CardFundingToken } from '../../../../UI/Card/types';
import type { CaipChainId } from '@metamask/utils';
import {
  setDelegationFlow,
  resetDelegationState,
} from '../../../../../core/redux/slices/card';
import { useConfirmNavigation } from '../useConfirmNavigation';
import { ConfirmationLoader } from '../../components/confirm/confirm-component';
import Routes from '../../../../../constants/navigation/Routes';

export interface PrepareAndNavigateParams {
  flow: 'onboarding' | 'manage' | 'enable';
  token?: CardFundingToken | null;
  canChangeToken?: boolean;
}

/**
 * Hook to prepare a cardDelegation transaction and navigate to the
 * appropriate confirmation screen.
 *
 * EVM: navigates to the redesigned confirmations flow (shows skeleton while
 * the network is ensured and the ERC-20 approve tx is queued).
 * Solana: navigates to the standalone SolanaCardDelegationScreen (shows
 * skeleton while the token is resolved); no EVM tx is involved.
 */
export function useCardDelegationTransaction() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { ensureNetworkExists } = useEnsureCardNetworkExists();
  const { navigateToConfirmation } = useConfirmNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const prepareAndNavigate = useCallback(
    async ({
      flow,
      token: providedToken,
      canChangeToken = true,
    }: PrepareAndNavigateParams) => {
      setIsLoading(true);

      // Clear stale state from any previous delegation session
      dispatch(resetDelegationState());

      // Determine chain early from the provided token so we can navigate
      // immediately and show a skeleton while async work runs.
      const isSolana =
        !!providedToken &&
        isSolanaChain(providedToken.caipChainId as CaipChainId);

      if (isSolana) {
        navigation.navigate(Routes.CARD.SOLANA_CARD_DELEGATION as never);
      } else {
        navigateToConfirmation({ loader: ConfirmationLoader.CardDelegation });
      }

      try {
        const token =
          await Engine.context.CardController.resolveDelegationToken(
            flow,
            providedToken,
          );

        // Store flow metadata before queuing the tx so CardDelegationInfo
        // gets the correct token on first mount (approval appears in the
        // same React flush as the setDelegationFlow dispatch).
        dispatch(
          setDelegationFlow({ flow, canChangeToken, selectedToken: token }),
        );

        if (isEvmChain(token.caipChainId as CaipChainId)) {
          // Ensure the card network exists in the user's network list
          const networkClientId = await ensureNetworkExists(
            token.caipChainId ?? '',
          );

          // Encode and queue the ERC-20 approve tx
          const { transactionId } =
            await Engine.context.CardController.queueDelegationApproval(
              token,
              networkClientId,
              BAANX_MAX_LIMIT,
            );

          return transactionId;
        }
      } catch (error) {
        Logger.error(
          error as Error,
          'useCardDelegationTransaction: Failed to prepare delegation',
        );
        navigation.goBack();
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [ensureNetworkExists, dispatch, navigateToConfirmation, navigation],
  );

  return {
    prepareAndNavigate,
    isLoading,
  };
}
