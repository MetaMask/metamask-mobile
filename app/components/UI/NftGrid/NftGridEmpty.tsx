import React, { useCallback } from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { strings } from '../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import styleSheet from './NftGrid.styles';
import { StackNavigationProp } from '@react-navigation/stack';
import AppConstants from '../../../core/AppConstants';

import noNftPlaceholderSrc from '../../../images/no-nfts-placeholder.png';
import { useTheme } from '../../../util/theme';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';

interface NftGridNavigationParamList {
  AddAsset: { assetType: string };
  [key: string]: undefined | object;
}

interface NftGridProps {
  navigation: StackNavigationProp<NftGridNavigationParamList, 'AddAsset'>;
}

function NftGridEmpty({ navigation }: NftGridProps) {
  const { colors } = useTheme();
  const styles = styleSheet(colors);

  const goToLearnMore = useCallback(
    () =>
      navigation.navigate('Webview', {
        screen: 'SimpleWebview',
        params: { url: AppConstants.URLS.NFT },
      }),
    [navigation],
  );

  return (
    <View
      testID="nft-empty-container"
      // eslint-disable-next-line react-native/no-inline-styles
      style={{
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Image
        testID="nft-empty-image"
        // eslint-disable-next-line react-native/no-color-literals, react-native/no-inline-styles
        style={{
          height: 90,
          width: 90,
          tintColor: 'lightgray',
          marginTop: 30,
          marginBottom: 12,
        }}
        source={noNftPlaceholderSrc}
        resizeMode="contain"
      />
      <Text
        testID="nft-empty-text"
        style={styles.headingMd}
        variant={TextVariant.HeadingMD}
        color={TextColor.Alternative}
      >
        {strings('wallet.no_nfts_yet')}
      </Text>
      <TouchableOpacity
        onPress={goToLearnMore}
        testID={WalletViewSelectorsIDs.IMPORT_NFT_BUTTON}
      >
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Info}>
          {strings('wallet.learn_more')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default NftGridEmpty;
