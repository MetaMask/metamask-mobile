import { useCallback } from 'react';
import { toHex } from '@metamask/controller-utils';
import { useNavigation } from '@react-navigation/native';

import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { addTransaction } from '../../../../../util/transaction-controller';
import { MMM_ORIGIN } from '../../constants/confirmations';
import { prepareEVMTransaction } from '../../utils/send';
import { useSendContext } from '../../context/send-context';

const useSendActions = () => {
  const { asset, from, to, value } = useSendContext();
  const navigation = useNavigation();
  const { chainId } = asset ?? { chainId: undefined };
  const { NetworkController } = Engine.context;

  const handleSubmitPress = useCallback(async () => {
    if (!chainId || !asset) {
      return;
    }
    const networkClientId = NetworkController.findNetworkClientIdByChainId(
      toHex(chainId),
    );
    // toHex is added here as sometime chainId in asset is not hexadecimal
    const trxnParams = prepareEVMTransaction(asset, { from, to, value });
    await addTransaction(trxnParams, {
      origin: MMM_ORIGIN,
      networkClientId,
    });
    navigation.navigate(
      Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
    );
  }, [asset, chainId, NetworkController, navigation, from, to, value]);

  const handleCancelPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return { handleSubmitPress, handleCancelPress };
};

export default useSendActions;
