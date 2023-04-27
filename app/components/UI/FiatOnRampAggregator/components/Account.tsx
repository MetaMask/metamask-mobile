import React from 'react';
import { useSelector } from 'react-redux';
import EthereumAddress from '../../EthereumAddress';
import JSIdenticon from '../../Identicon';
import Text from '../../../Base/Text';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../../../util/theme';
import { Colors } from '../../../../util/theme/models';
import { colors as importedColors } from '../../../../styles/common';
// TODO: Convert into typescript and correctly type
const Identicon = JSIdenticon as any;

const createStyles = (colors: Colors) =>
  StyleSheet.create({
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
    transparentContainer: {
      backgroundColor: importedColors.transparent,
      paddingVertical: 0,
      paddingHorizontal: 0,
    },
  });

const Account = ({
  address,
  transparent = false,
}: {
  address?: string;
  transparent?: boolean;
}) => {
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
    <View
      style={[styles.container, transparent && styles.transparentContainer]}
    >
      <Identicon diameter={15} address={address || selectedAddress} />
      <Text style={styles.accountText} primary centered numberOfLines={1}>
        {identities[address || selectedAddress]?.name} (
        <EthereumAddress address={address || selectedAddress} type={'short'} />)
      </Text>
    </View>
  );
};

export default Account;
