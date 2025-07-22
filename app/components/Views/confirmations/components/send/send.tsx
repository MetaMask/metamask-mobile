import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Input from '../../../../../component-library/components/Form/TextField/foundation/Input';
import Text from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './send.styles';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import Routes from '../../../../../constants/navigation/Routes';
import { TransactionParams } from '@metamask/transaction-controller';
import { CaipChainId, Hex } from '@metamask/utils';
import { addTransaction } from '../../../../../util/transaction-controller';
import { MMM_ORIGIN } from '../../constants/confirmations';
import { getNetworkClientIdForCaipChainId } from '../../../../../core/WalletConnect/wc-utils';
import Engine from '../../../../../core/Engine';

interface Asset {
  name: string;
  chainId: CaipChainId;
}

const Send = () => {
  const navigation = useNavigation();
  const from = useSelector(selectSelectedInternalAccount);
  const route = useRoute<RouteProp<Record<string, { asset: Asset }>, string>>();
  const { asset } = route?.params ?? {};
  const { chainId } = asset ?? {};
  const { styles } = useStyles(styleSheet, {});
  const [transactionParams, setTransactionParams] = useState<TransactionParams>(
    {
      from: from?.address as string,
      to: '0xa4A80ce0AFDfb8E6bd1221D3b18a1653EEE6d19d',
    },
  );

  const submitSend = useCallback(async () => {
    const { NetworkController } = Engine.context;
    const networkClientId = NetworkController.findNetworkClientIdByChainId(
      chainId as Hex,
    );
    await addTransaction(transactionParams, {
      origin: MMM_ORIGIN,
      networkClientId,
    });
    navigation.navigate(Routes.SEND.DEFAULT, {
      screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
    });
  }, [chainId, navigation, transactionParams]);

  const cancelSend = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text>Asset: {asset?.name ?? 'NA'}</Text>
      <View>
        <Text>From:</Text>
        <Text>{from?.address}</Text>
      </View>
      <View>
        <Text>To:</Text>
        <Input
          style={styles.input}
          onChangeText={(to: string) => {
            setTransactionParams({ ...transactionParams, to });
          }}
          value={transactionParams.to}
        />
      </View>
      <View>
        <Text>Value:</Text>
        <Input
          style={styles.input}
          onChangeText={(value: string) => {
            setTransactionParams({ ...transactionParams, value });
          }}
        />
      </View>
      <Button
        label="Cancel"
        onPress={cancelSend}
        variant={ButtonVariants.Secondary}
        size={ButtonSize.Lg}
      />
      <Button
        label="Confirm"
        onPress={submitSend}
        variant={ButtonVariants.Primary}
        size={ButtonSize.Lg}
      />
    </View>
  );
};

export default Send;
