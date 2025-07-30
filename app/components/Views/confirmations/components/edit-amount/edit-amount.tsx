import React, { useEffect } from 'react';
import { TextInput, View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { Interface } from '@ethersproject/abi';
import { abiERC20 } from '@metamask/metamask-eth-abis';
import { useTokenAmount } from '../../hooks/useTokenAmount';
import { useTokenAsset } from '../../hooks/useTokenAsset';
import Engine from '../../../../../core/Engine';
import { useTransactionMetadataOrThrow } from '../../hooks/transactions/useTransactionMetadataRequest';
import { calcTokenValue } from '../../../../../util/transactions';

export function EditAmount() {
  const { id: transactionId } = useTransactionMetadataOrThrow();
  const tokenAmount = useTokenAmount();
  const [amount, setAmount] = React.useState<string>();
  const asset = useTokenAsset();

  useEffect(() => {
    if (!amount && tokenAmount.amountPrecise) {
      setAmount(tokenAmount.amountPrecise);
    }
  }, [amount, tokenAmount.amountPrecise]);

  const handleChange = (text: string) => {
    const value = calcTokenValue(text.slice(0), asset.asset.decimals);

    const newData = new Interface(abiERC20).encodeFunctionData('transfer', [
      '0x0000000000000000000000000000000000000000', // Placeholder address
      value.toString(10),
    ]);

    Engine.context.TransactionController.updateEditableParams(transactionId, {
      data: newData,
    });

    setAmount(text);
  };

  return (
    <View style={{ paddingTop: 40, paddingBottom: 40 }}>
      <TextInput
        value={'$' + amount}
        onChangeText={handleChange}
        keyboardType="numeric"
        placeholder="Enter amount"
        style={{
          textAlign: 'center',
          fontSize: 64,
          fontWeight: '500',
        }}
      />
      <Text
        variant={TextVariant.BodyMDMedium}
        color={TextColor.Alternative}
        style={{ textAlign: 'center' }}
      >
        Available: $4.56
      </Text>
    </View>
  );
}
