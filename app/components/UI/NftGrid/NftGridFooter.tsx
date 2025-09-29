import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import React from 'react';
import { isNftFetchingProgressSelector } from '../../../reducers/collectibles';
import TextComponent from '../../../component-library/components/Texts/Text';
import { useSelector } from 'react-redux';
import { SpinnerTestId } from '../CollectibleContracts/constants';
import { strings } from '../../../../locales/i18n';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { ThemeColors } from '@metamask/design-tokens';
import { useTheme } from '../../../util/theme';
import { fontStyles } from '../../../styles/common';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    footer: {
      flex: 1,
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 25,
    },
    spinner: {
      marginBottom: 8,
    },
    emptyText: {
      color: colors.text.alternative,
      fontSize: 14,
    },
    addText: {
      fontSize: 14,
      color: colors.primary.default,
      ...fontStyles.normal,
    },
  });

const NftGridFooter = ({
  isAddNFTEnabled,
  goToAddCollectible,
}: {
  isAddNFTEnabled: boolean;
  goToAddCollectible: () => void;
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const isNftFetchingProgress = useSelector(isNftFetchingProgressSelector);

  return (
    <View style={styles.footer} key={'collectible-contracts-footer'}>
      {isNftFetchingProgress ? (
        <ActivityIndicator
          size="large"
          style={styles.spinner}
          testID={SpinnerTestId}
        />
      ) : null}

      <TextComponent style={styles.emptyText}>
        {strings('wallet.no_collectibles')}
      </TextComponent>

      <TouchableOpacity
        onPress={goToAddCollectible}
        disabled={!isAddNFTEnabled}
        testID={WalletViewSelectorsIDs.IMPORT_NFT_BUTTON}
      >
        <TextComponent style={styles.addText}>
          {strings('wallet.add_collectibles')}
        </TextComponent>
      </TouchableOpacity>
    </View>
  );
};

export default NftGridFooter;
