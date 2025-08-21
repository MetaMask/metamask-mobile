import { Hex } from '@metamask/utils';
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { InternalAccount } from '@metamask/keyring-internal-api';

import Routes from '../../../../../constants/navigation/Routes';
import {
  submitEvmTransaction,
  submitNonEvmTransaction,
} from '../../utils/send';
import { useSendContext } from '../../context/send-context';
import { useSendType } from './useSendType';
import { useSendExitMetrics } from './metrics/useSendExitMetrics';

export const useSendActions = () => {
  const { asset, chainId, fromAccount, from, to, value } = useSendContext();
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
          asset,
          chainId: chainId as Hex,
          from: from as Hex,
          to: toAddress as Hex,
          value: value as string,
        });
      } else {
        await submitNonEvmTransaction({
          asset,
          fromAccount: fromAccount as InternalAccount,
        });
      }

      navigation.navigate(
        Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      );
    },
    [asset, chainId, navigation, fromAccount, from, isEvmSendType, to, value],
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
