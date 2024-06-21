import React, { useCallback, useEffect } from 'react';
import { SafeAreaView, View } from 'react-native';
import { useSelector } from 'react-redux';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import AddCustomToken from '../../UI/AddCustomToken';
import SearchTokenAutocomplete from '../../UI/SearchTokenAutocomplete';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { strings } from '../../../../locales/i18n';
import AddCustomCollectible from '../../UI/AddCustomCollectible';
import {
  getImportTokenNavbarOptions,
  getNetworkNavbarOptions,
} from '../../UI/Navbar';
import { isTokenDetectionSupportedForNetwork } from '@metamask/assets-controllers';
import {
  selectChainId,
  selectProviderConfig,
} from '../../../selectors/networkController';
import { selectNetworkName } from '../../../selectors/networkInfos';
import { selectDisplayNftMedia } from '../../../selectors/preferencesController';
import Banner from '../../../component-library/components/Banners/Banner/Banner';
import {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../component-library/components/Banners/Banner';
import Text from '../../../component-library/components/Texts/Text/Text';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import { useNavigation } from '@react-navigation/native';
import { useParams } from '../../../util/navigation/navUtils';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './AddAsset.styles';
import { AddAssetParams } from './AddAsset.types';
import Routes from '../../../constants/navigation/Routes';
import { NFT_TITLE, TOKEN, TOKEN_TITLE } from './AddAsset.constants';
import { AddAssetViewSelectorsIDs } from '../../../../e2e/selectors/AddAssetView.selectors';

const AddAsset = () => {
  const navigation = useNavigation();
  const { assetType, collectibleContract } = useParams<AddAssetParams>();

  const {
    styles,
    theme: { colors },
  } = useStyles(styleSheet, {});

  const providerConfig = useSelector(selectProviderConfig);
  const chainId = useSelector(selectChainId);
  const displayNftMedia = useSelector(selectDisplayNftMedia);

  const isTokenDetectionSupported =
    isTokenDetectionSupportedForNetwork(chainId);

  const networkName = useSelector(selectNetworkName);

  const updateNavBar = useCallback(() => {
    navigation.setOptions(
      assetType === TOKEN
        ? getImportTokenNavbarOptions(
            `add_asset.${TOKEN_TITLE}`,
            true,
            navigation,
            colors,
            true,
            0,
          )
        : getNetworkNavbarOptions(
            `add_asset.${assetType === TOKEN ? TOKEN_TITLE : NFT_TITLE}`,
            true,
            navigation,
            colors,
          ),
    );
  }, [assetType, colors, navigation]);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  const goToSecuritySettings = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SHOW_NFT_DISPLAY_MEDIA,
    });
  };

  const renderTabBar = (props) => (
    <View style={styles.base}>
      <DefaultTabBar
        underlineStyle={styles.tabUnderlineStyle}
        activeTextColor={colors.primary.default}
        inactiveTextColor={colors.text.alternative}
        backgroundColor={colors.background.default}
        tabStyle={styles.tabStyle}
        textStyle={styles.textStyle}
        tabPadding={32}
        style={styles.tabBar}
        {...props}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.wrapper} testID={`add-${assetType}-screen`}>
      {assetType !== 'token' && (
        <View style={styles.infoWrapper}>
          <Banner
            variant={BannerVariant.Alert}
            description={
              !displayNftMedia ? (
                <>
                  <Text variant={TextVariant.BodyMD}>
                    {strings('wallet.display_nft_media_cta_new_1')}
                    <Text variant={TextVariant.BodyMDBold}>
                      {' '}
                      {strings('wallet.display_nft_media_cta_new_2')}
                    </Text>
                  </Text>
                </>
              ) : (
                <Text
                  variant={TextVariant.BodyMD}
                  testID={AddAssetViewSelectorsIDs.WARNING_ENABLE_DISPLAY_MEDIA}
                >
                  {strings('wallet.display_media_nft_warning')}
                </Text>
              )
            }
            severity={
              !displayNftMedia
                ? BannerAlertSeverity.Info
                : BannerAlertSeverity.Warning
            }
            actionButtonProps={
              !displayNftMedia
                ? {
                    variant: ButtonVariants.Link,
                    onPress: goToSecuritySettings,
                    textVariant: TextVariant.BodyMD,
                    label: strings('wallet.display_nft_media_cta'),
                  }
                : undefined
            }
          />
        </View>
      )}
      {assetType === 'token' ? (
        <ScrollableTabView key={chainId} renderTabBar={renderTabBar}>
          {isTokenDetectionSupported && (
            <SearchTokenAutocomplete
              navigation={navigation}
              tabLabel={strings('add_asset.search_token')}
            />
          )}
          <AddCustomToken
            chainId={chainId}
            networkName={networkName}
            ticker={providerConfig.ticker}
            type={providerConfig.type}
            navigation={navigation}
            tabLabel={strings('add_asset.custom_token')}
            isTokenDetectionSupported={isTokenDetectionSupported}
          />
        </ScrollableTabView>
      ) : (
        <AddCustomCollectible
          navigation={navigation}
          collectibleContract={collectibleContract}
        />
      )}
    </SafeAreaView>
  );
};

export default AddAsset;
