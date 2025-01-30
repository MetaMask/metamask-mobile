import React, { useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { strings } from '../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { StackNavigationProp } from '@react-navigation/stack';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';

interface NftGridNavigationParamList {
  AddAsset: { assetType: string };
  [key: string]: undefined | object;
}

interface NftGridFooterProps {
  navigation: StackNavigationProp<NftGridNavigationParamList, 'AddAsset'>;
}

const styles = StyleSheet.create({
  footerContainer: {
    display: 'flex',
    alignItems: 'center',
  },
});

function NftGridFooter({ navigation }: NftGridFooterProps) {
  const handlePress = useCallback(
    () => navigation.push('AddAsset', { assetType: 'collectible' }),
    [navigation],
  );

  return (
    <View style={styles.footerContainer}>
      <Text variant={TextVariant.BodyMDMedium} color={TextColor.Alternative}>
        {strings('wallet.no_collectibles')}
      </Text>
      <TouchableOpacity
        onPress={handlePress}
        disabled={false}
        testID={WalletViewSelectorsIDs.IMPORT_NFT_BUTTON}
      >
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Info}>
          {strings('wallet.add_collectibles')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default NftGridFooter;
