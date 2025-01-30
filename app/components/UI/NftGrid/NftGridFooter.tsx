import React from 'react';
import { View, TouchableOpacity } from 'react-native';
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

function NftGridFooter({ navigation }: NftGridFooterProps) {
  return (
    <View
      // eslint-disable-next-line react-native/no-inline-styles
      style={{
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Text variant={TextVariant.BodyMDMedium} color={TextColor.Alternative}>
        {strings('wallet.no_collectibles')}
      </Text>
      <TouchableOpacity
        onPress={() =>
          navigation.push('AddAsset', { assetType: 'collectible' })
        }
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
