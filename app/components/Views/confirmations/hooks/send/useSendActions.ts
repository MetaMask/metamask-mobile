import { CaipAssetType, Hex } from '@metamask/utils';
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { InternalAccount } from '@metamask/keyring-internal-api';

import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { AssetType } from '../../types/token';
import Logger from '../../../../../util/Logger';
import { sendMultichainTransactionForReview } from '../../utils/multichain-snaps';
import {
  addLeadingZeroIfNeeded,
  normalizeAmount,
  submitEvmTransaction,
} from '../../utils/send';
import { useSendContext } from '../../context/send-context';
import { useSendMetricsContext } from '../../context/send-context/send-metrics-context';
import { useSendType } from './useSendType';
import { useMaxAmount, usePercentageAmount } from './usePercentageAmount';
import { useSendExitMetrics } from './metrics/useSendExitMetrics';
import {
  classifyNonEvmSendError,
  NonEvmSendErrorCode,
  NonEvmSendFailurePhase,
  useNonEvmSendMetrics,
} from './metrics/useNonEvmSendMetrics';
import { ConfirmationLoader } from '../../components/confirm/confirm-component';
import { mapSnapErrorCodeIntoTranslation } from './useAmountValidation';

interface SnapConfirmSendResult {
  valid?: boolean;
  errors?: { code: string }[];
  transactionId?: string;
}

/**
 * Cancel and back actions for the Send flow, without any gas estimation.
 */
export const useSendNavigationActions = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { captureSendExit } = useSendExitMetrics();

  const handleCancelPress = useCallback(() => {
    captureSendExit();

    // Exit the whole Send flow (main stack), not just the nested send screen.
    const parentNavigation = navigation.getParent();
    if (parentNavigation) {
      parentNavigation.goBack();
      return;
    }
    navigation.goBack();
  }, [captureSendExit, navigation]);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return { handleCancelPress, handleBackPress };
};

const useSendActionsWithMax = (
  getMaxAmount: ReturnType<typeof useMaxAmount>['getMaxAmount'],
) => {
  const { asset, chainId, fromAccount, from, maxValueMode, to, value } =
    useSendContext();
  const { chainIdCaip } = useSendMetricsContext();
  const navigation = useNavigation<AppNavigationProp>();
  const { isEvmNativeSendType, isEvmSendType } = useSendType();
  const { captureSendFailed } = useNonEvmSendMetrics();
  const navigationActions = useSendNavigationActions();
  const handleSubmitPress = useCallback(
    async (recipientAddress?: string) => {
      if (!chainId || !asset) {
        return;
      }

      // Context update is not immediate when submitting from the recipient list
      // so we use the passed recipientAddress or fall back to the context value
      const toAddress = recipientAddress || to;
      if (isEvmSendType) {
        const maxAmount =
          maxValueMode && isEvmNativeSendType
            ? await getMaxAmount(toAddress as string)
            : undefined;
        if (maxValueMode && isEvmNativeSendType && maxAmount === undefined) {
          Alert.alert(strings('send.transaction_error'));
          return;
        }

        await submitEvmTransaction({
          asset: asset as AssetType,
          chainId: chainId as Hex,
          from: from as Hex,
          to: toAddress as Hex,
          value: maxAmount ?? normalizeAmount(value),
        });
        navigation.navigate(
          Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
          {
            params: {
              maxValueMode,
            },
            loader: ConfirmationLoader.Transfer,
          },
        );
      } else {
        // The metrics context defaults chainIdCaip to an empty string, which
        // never falls through `??`. Use `||` so an unresolved context value
        // still falls back to the send's own chain id.
        const resolvedChainIdCaip =
          chainIdCaip || (chainId as string | undefined);
        const snapId = fromAccount?.metadata?.snap?.id;

        try {
          const result = (await sendMultichainTransactionForReview(
            fromAccount as InternalAccount,
            {
              fromAccountId: fromAccount?.id as string,
              toAddress: toAddress as string,
              assetId: ((asset as AssetType)?.assetId ??
                asset?.address) as CaipAssetType,
              amount: addLeadingZeroIfNeeded(normalizeAmount(value)) as string,
            },
          )) as SnapConfirmSendResult;

          // Check if the snap returned a validation error
          if (result?.valid === false) {
            const errorCode = result?.errors?.[0]?.code;
            const errorMessage = errorCode
              ? mapSnapErrorCodeIntoTranslation(errorCode)
              : strings('send.transaction_error');
            captureSendFailed({
              chainIdCaip: resolvedChainIdCaip,
              snapId,
              failurePhase: NonEvmSendFailurePhase.Validation,
              errorCode: errorCode ?? NonEvmSendErrorCode.Unknown,
            });
            Alert.alert(errorMessage);
            return;
          }

          // Success. The Snap owns the rest of the non-EVM transaction
          // lifecycle (Submitted/Finalized) and emits those itself.
          navigation.navigate(Routes.TRANSACTIONS_VIEW);
        } catch (error) {
          // Check for user rejection using error code (4001) - this is language-independent
          const { errorCode, failurePhase } = classifyNonEvmSendError(error);
          const isUserRejection =
            errorCode === NonEvmSendErrorCode.UserRejected;

          captureSendFailed({
            chainIdCaip: resolvedChainIdCaip,
            snapId,
            failurePhase,
            errorCode,
          });

          if (!isUserRejection) {
            // Actual snap/internal error - display error message to user
            Alert.alert(strings('send.transaction_error'));
          }

          Logger.log('Multichain transaction for review rejected: ', error);
        }
      }
    },
    [
      asset,
      chainId,
      chainIdCaip,
      navigation,
      fromAccount,
      from,
      getMaxAmount,
      isEvmNativeSendType,
      isEvmSendType,
      maxValueMode,
      to,
      value,
      captureSendFailed,
    ],
  );

  return { ...navigationActions, handleSubmitPress };
};

export const useSendActions = () => {
  const { getMaxAmount } = useMaxAmount();
  return useSendActionsWithMax(getMaxAmount);
};

export const useSendAmountActions = () => {
  const { getMaxAmount, getPercentageAmount, isMaxAmountSupported } =
    usePercentageAmount();
  const actions = useSendActionsWithMax(getMaxAmount);

  return { ...actions, getPercentageAmount, isMaxAmountSupported };
};
