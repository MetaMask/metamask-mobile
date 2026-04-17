import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { useEnsureCardNetworkExists } from '../../../../UI/Card/hooks/useEnsureCardNetworkExists';
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
 * Delegates token resolution and transaction queuing to CardController.
 * Keeps only UI concerns: network setup, navigation, Redux flow state.
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

      // Navigate immediately so the skeleton shows while we do async work
      navigateToConfirmation({ loader: ConfirmationLoader.CardDelegation });

      try {
        // Resolve the delegation token via the controller (fetches list if none provided)
        const token =
          await Engine.context.CardController.resolveDelegationToken(
            flow,
            providedToken,
          );

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

        // Store flow metadata in Redux so CardDelegationInfo can read it
        dispatch(
          setDelegationFlow({
            flow,
            canChangeToken,
            selectedToken: token,
          }),
        );

        return transactionId;
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
    [ensureNetworkExists, dispatch, navigateToConfirmation, navigation],
  );

  return {
    prepareAndNavigate,
    isLoading,
  };
}
