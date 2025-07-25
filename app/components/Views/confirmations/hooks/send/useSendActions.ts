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
  const { asset, transactionParams, updateTransactionParams } =
    useSendContext();
  const navigation = useNavigation();
  const { chainId } = asset ?? { chainId: undefined };
  const { NetworkController } = Engine.context;

  const submitSend = useCallback(async () => {
    if (!chainId || !asset) {
      return;
    }
    const networkClientId = NetworkController.findNetworkClientIdByChainId(
      toHex(chainId),
    );
    // toHex is added here as sometime chainId in asset is not hexadecimal
    const trxnParams = prepareEVMTransaction(asset, transactionParams);
    await addTransaction(trxnParams, {
      origin: MMM_ORIGIN,
      networkClientId,
    });
    navigation.navigate(
      Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
    );
  }, [asset, chainId, NetworkController, navigation, transactionParams]);

  const cancelSend = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return { submitSend, cancelSend };
};

export default useSendActions;
