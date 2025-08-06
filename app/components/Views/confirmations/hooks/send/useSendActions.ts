import { Hex } from '@metamask/utils';
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';

import Routes from '../../../../../constants/navigation/Routes';
import {
  submitEvmTransaction,
  submitNonEvmTransaction,
} from '../../utils/send';
import { useSendContext } from '../../context/send-context';
import { useSendType } from './useSendType';

export const useSendActions = () => {
  const { asset, chainId, fromAccount, from, to, value } = useSendContext();
  const navigation = useNavigation();
  const { isEvmSendType } = useSendType();

  const handleSubmitPress = useCallback(async () => {
    if (!chainId || !asset) {
      return;
    }

    if (isEvmSendType) {
      await submitEvmTransaction({
        asset,
        chainId: chainId as Hex,
        from: from as Hex,
        to: to as Hex,
        value: value as string,
      });
    } else {
      await submitNonEvmTransaction({
        asset,
        fromAccount,
      });
    }

    navigation.navigate(
      Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
    );
  }, [asset, chainId, navigation, fromAccount, from, isEvmSendType, to, value]);

  const handleCancelPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return { handleSubmitPress, handleCancelPress };
};
