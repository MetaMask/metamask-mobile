import React from 'react';
import { useSelector } from 'react-redux';
import EthereumAddress from '../../EthereumAddress';
import JSIdenticon from '../../Identicon';
import BaseText from '../../../Base/Text';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../../../util/theme';
import { Colors } from '../../../../util/theme/models';

// TODO: Convert into typescript and correctly type
const Text = BaseText as any;
const Identicon = JSIdenticon as any;

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    selector: {
      flexShrink: 1,
    },
    accountText: {
      flexShrink: 1,
      marginVertical: 3,
      marginHorizontal: 5,
    },
    container: {
      backgroundColor: colors.background.alternative,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 100,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 1,
    },
  });

const Account = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const selectedAddress = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );
  const identities = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.identities,
  );
  return (
    <View style={styles.container}>
      <Identicon diameter={15} address={selectedAddress} />
      <Text style={styles.accountText} primary centered numberOfLines={1}>
        {identities[selectedAddress]?.name} (
        <EthereumAddress address={selectedAddress} type={'short'} />)
      </Text>
    </View>
  );
};

export default Account;
