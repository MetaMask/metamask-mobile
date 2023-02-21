import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/EvilIcons';
import Device from '../../../../util/device';
import { renderFromWei } from '../../../../util/number';
import { useTheme } from '../../../../util/theme';
import { fontStyles } from '../../../../styles/common';
import EthereumAddress from '../../../UI/EthereumAddress';

interface IAccountDetailsProps {
  index: number;
  address: string;
  balance: string;
  ticker: string;
  toBlockExplorer: (address: string) => void;
}

const createStyle = (colors: any) =>
  StyleSheet.create({
    rowContainer: {
      flex: 1,
      height: 65,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingLeft: Device.isIphoneX() ? 20 : 10,
    },
    accountDetails: {
      justifyContent: 'flex-start',
    },
    linkIcon: {
      height: '100%',
      fontSize: 36,
      textAlignVertical: 'center',
    },
    index: {
      fontSize: 20,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    information: {
      color: colors.text.alternative,
      ...fontStyles.normal,
    },
  });

const AccountDetails = (props: IAccountDetailsProps) => {
  const { colors } = useTheme();
  const styles = createStyle(colors);
  const { index, address, balance, ticker, toBlockExplorer } = props;
  const defaultTicker = 'ETH';

  return (
    <View style={styles.rowContainer}>
      <View style={styles.accountDetails}>
        <Text style={styles.index}>{index}</Text>
        <EthereumAddress
          style={styles.information}
          address={address}
          type={'short'}
        />
        <Text style={styles.information}>
          {renderFromWei(balance)} {ticker || defaultTicker}
        </Text>
      </View>
      <Icon
        size={18}
        name={'external-link'}
        onPress={() => toBlockExplorer(address)}
        style={styles.linkIcon}
        color={colors.text.default}
      />
    </View>
  );
};

export default React.memo(AccountDetails);
