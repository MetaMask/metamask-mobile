import { Image, StyleSheet, View } from 'react-native';
import React, { useCallback } from 'react';
import { strings } from '../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import AppConstants from '../../../core/AppConstants';
import TextComponent from '../../../component-library/components/Texts/Text';
import { useTheme } from '../../../util/theme';
import { ThemeColors } from '@metamask/design-tokens';
import noNftsPlaceholder from '../../../images/no-nfts-placeholder.png';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
    },
    emptyImageContainer: {
      width: 76,
      height: 76,
      marginTop: 30,
      marginBottom: 12,
      tintColor: colors.icon.muted,
    },
    emptyTitleText: {
      fontSize: 24,
      color: colors.text.alternative,
    },
  });

const NftGridEmpty = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const goToLearnMore = useCallback(
    () =>
      navigation.navigate('Webview', {
        screen: 'SimpleWebview',
        params: { url: AppConstants.URLS.NFT },
      }),
    [navigation],
  );

  return (
    <View style={styles.emptyContainer} testID="nft-empty-container">
      <Image
        style={styles.emptyImageContainer}
        source={noNftsPlaceholder}
        resizeMode={'contain'}
      />

      <TextComponent style={styles.emptyTitleText}>
        {strings('wallet.no_nfts_yet')}
      </TextComponent>

      <TextComponent onPress={goToLearnMore}>
        {strings('wallet.learn_more')}
      </TextComponent>
    </View>
  );
};

export default NftGridEmpty;
