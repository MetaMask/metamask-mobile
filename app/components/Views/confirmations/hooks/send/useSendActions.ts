import { CaipAssetType, Hex } from '@metamask/utils';
import { useCallback } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { InternalAccount } from '@metamask/keyring-internal-api';

import Routes from '../../../../../constants/navigation/Routes';
import { AssetType } from '../../types/token';
import Logger from '../../../../../util/Logger';
import { sendMultichainTransactionForReview } from '../../utils/multichain-snaps';
import { addLeadingZeroIfNeeded, submitEvmTransaction } from '../../utils/send';
import { useSendContext } from '../../context/send-context';
import { useSendType } from './useSendType';
import { useSendExitMetrics } from './metrics/useSendExitMetrics';
import { ConfirmationLoader } from '../../components/confirm/confirm-component';
import { InitSendLocation } from '../../constants/send';

export const useSendActions = () => {
  const route = useRoute();
  // The location is nested in route.params.params.location due to navigation structure
  const location = (route.params as { params: { location: string } })?.params
    ?.location as string | undefined;

  const { asset, chainId, fromAccount, from, maxValueMode, to, value } =
    useSendContext();
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
          await sendMultichainTransactionForReview(
            fromAccount as InternalAccount,
            {
              fromAccountId: fromAccount?.id as string,
              toAddress: toAddress as string,
              assetId: ((asset as AssetType)?.assetId ??
                asset?.address) as CaipAssetType,
              amount: addLeadingZeroIfNeeded(value) as string,
            },
          );
          navigation.navigate(Routes.TRANSACTIONS_VIEW);
        } catch (error) {
          // Do nothing on rejection - intentionally ignored
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
      value,
    ],
  );

  const handleCancelPress = useCallback(() => {
    captureSendExit();
    if (location === InitSendLocation.AssetOverview) {
      navigation.goBack();
    } else {
      navigation.navigate(Routes.WALLET_VIEW);
    }
  }, [captureSendExit, location, navigation]);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return { handleSubmitPress, handleCancelPress, handleBackPress };
};
