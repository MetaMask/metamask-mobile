import { CaipAssetType, Hex } from '@metamask/utils';
import { useCallback } from 'react';
import { ParamListBase, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { InternalAccount } from '@metamask/keyring-internal-api';

import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { AssetType } from '../../types/token';
import Logger from '../../../../../util/Logger';
import { sendMultichainTransactionForReview } from '../../utils/multichain-snaps';
import { addLeadingZeroIfNeeded, submitEvmTransaction } from '../../utils/send';
import { useSendContext } from '../../context/send-context';
import { useSendType } from './useSendType';
import { useSendExitMetrics } from './metrics/useSendExitMetrics';
import { ConfirmationLoader } from '../../components/confirm/confirm-component';
import { mapSnapErrorCodeIntoTranslation } from './useAmountValidation';

interface SnapConfirmSendResult {
  valid?: boolean;
  errors?: { code: string }[];
  transactionId?: string;
}

export const useSendActions = () => {
  const {
    asset,
    chainId,
    fromAccount,
    from,
    maxValueMode,
    to,
    updateSubmitError,
    value,
  } = useSendContext();
  const navigation = useNavigation();
  const { isEvmSendType } = useSendType();
  const { captureSendExit } = useSendExitMetrics();
  const handleSubmitPress = useCallback(
    async (recipientAddress?: string) => {
      if (!chainId || !asset) {
        return;
      }

      // Context update is not immediate when submitting from the recipient list
      // so we use the passed recipientAddress or fall back to the context value
      const toAddress = recipientAddress || to;

      // Clear any previous submit error
      updateSubmitError(undefined);

      if (isEvmSendType) {
        submitEvmTransaction({
          asset: asset as AssetType,
          chainId: chainId as Hex,
          from: from as Hex,
          to: toAddress as Hex,
          value: value as string,
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
        try {
          const result = (await sendMultichainTransactionForReview(
            fromAccount as InternalAccount,
            {
              fromAccountId: fromAccount?.id as string,
              toAddress: toAddress as string,
              assetId: ((asset as AssetType)?.assetId ??
                asset?.address) as CaipAssetType,
              amount: addLeadingZeroIfNeeded(value) as string,
            },
          )) as SnapConfirmSendResult;

          // Check if the snap returned a validation error
          if (result?.valid === false) {
            const errorMessage = result?.errors?.length
              ? mapSnapErrorCodeIntoTranslation(result.errors[0].code)
              : strings('send.transaction_error');
            updateSubmitError(errorMessage);
            // Navigate back 2 screens to the Amount screen where the error can be displayed
            // (Recipient screen may not have a visible button when recipient is selected from list)
            (navigation as StackNavigationProp<ParamListBase>).pop(2);
            return;
          }

          // Success - navigate to transactions view
          navigation.navigate(Routes.TRANSACTIONS_VIEW);
        } catch (error) {
          // User rejected or other error - clear any error state and navigate back
          updateSubmitError(undefined);
          (navigation as StackNavigationProp<ParamListBase>).pop(2);
          Logger.log('Multichain transaction for review rejected: ', error);
        }
      }
    },
    [
      asset,
      chainId,
      navigation,
      fromAccount,
      from,
      isEvmSendType,
      maxValueMode,
      to,
      updateSubmitError,
      value,
    ],
  );

  const handleCancelPress = useCallback(() => {
    captureSendExit();

    navigation.goBack();
  }, [captureSendExit, navigation]);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return { handleSubmitPress, handleCancelPress, handleBackPress };
};
