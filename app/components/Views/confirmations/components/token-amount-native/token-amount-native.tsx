import React from 'react';
import { useSelector } from 'react-redux';
import { useTokenAmount } from '../../hooks/useTokenAmount';
import { useTransactionMetadataOrThrow } from '../../hooks/transactions/useTransactionMetadataRequest';
import { View } from 'react-native';
import Text from '../../../../../component-library/components/Texts/Text';
import { selectTickerByChainId } from '../../../../../selectors/networkController';
import { RootState } from '../../../../../reducers';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './token-amount-native.styles';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';

export function TokenAmountNative() {
  const { styles } = useStyles(styleSheet, {});
  const { amountNative } = useTokenAmount();
  const { chainId } = useTransactionMetadataOrThrow();

  const ticker = useSelector((state: RootState) =>
    selectTickerByChainId(state, chainId),
  );

  return (
    <View style={styles.container}>
      <Text>
        {amountNative} {ticker}
      </Text>
      <Icon name={IconName.SwapVertical} size={IconSize.Md} />
    </View>
  );
}
