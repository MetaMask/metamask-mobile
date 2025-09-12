import { CaipAssetType, Hex } from '@metamask/utils';
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { InternalAccount } from '@metamask/keyring-internal-api';

import Routes from '../../../../../constants/navigation/Routes';
import { AssetType } from '../../types/token';
import { sendMultichainTransactionForReview } from '../../utils/multichain-snaps';
import { submitEvmTransaction } from '../../utils/send';
import { useSendContext } from '../../context/send-context';
import { useSendType } from './useSendType';
import { useSendExitMetrics } from './metrics/useSendExitMetrics';

export const useSendActions = () => {
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
          },
        );
      } else {
        await sendMultichainTransactionForReview(
          fromAccount as InternalAccount,
          {
            fromAccountId: fromAccount?.id as string,
            toAddress: toAddress as string,
            assetId: ((asset as AssetType)?.assetId ??
              asset?.address) as CaipAssetType,
            amount: value as string,
          },
        );
        navigation.navigate(Routes.WALLET_VIEW);
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
    navigation.navigate(Routes.WALLET_VIEW);
  }, [captureSendExit, navigation]);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return { handleSubmitPress, handleCancelPress, handleBackPress };
};
