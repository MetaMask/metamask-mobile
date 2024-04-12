import React, { useCallback, useEffect } from 'react';
import { View, Platform } from 'react-native';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useParams } from '../../../util/navigation/navUtils';
import createStyles from './styles';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import { getImportTokenNavbarOptions } from '../Navbar';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import AssetIcon from '../AssetIcon';
import {
  getTestNetImageByChainId,
  isLineaMainnet,
  isMainNet,
  isTestNet,
} from '../../../util/networks';
import images from 'images/image-icons';
import SkeletonText from '../Ramp/components/SkeletonText';
import { TOKEN_BALANCE_LOADING } from '../Tokens/constants';
import useBalance from '../Ramp/hooks/useBalance';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ScrollView } from 'react-native-gesture-handler';
import Modal from 'react-native-modal';
import Box from '../Ramp/components/Box';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Routes from '../../../constants/navigation/Routes';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  ADD_CANCEL_ADD_CUSTOM_ASSET_MODAL,
  ADD_CONFIRM_CUSTOM_ASSET,
} from '../../../../wdio/screen-objects/testIDs/Screens/AddCustomToken.testIds';
import { TOKEN_TITLE } from '../../../components/Views/AddAsset/AddAsset.constants';

const RenderBalance = (asset: {
  symbol: string;
  address: string;
  iconUrl: string;
  name: string;
  decimals: number;
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const { balanceFiat } = useBalance(
    asset
      ? {
          address: asset.address,
          decimals: asset.decimals,
        }
      : undefined,
  );
  return (
    <View style={styles.balanceSection}>
      <Text variant={TextVariant.BodyLGMedium} style={styles.balanceFiat}>
        {balanceFiat === TOKEN_BALANCE_LOADING ? (
          <SkeletonText thin style={styles.skeleton} />
        ) : (
          balanceFiat ?? ''
        )}
      </Text>
    </View>
  );
};

const ConfirmAddAsset = () => {
  const { selectedAsset, networkName, chainId, ticker, addTokenList } =
    useParams<any>();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const [showExitModal, setShowExitModal] = React.useState(false);
  const showExitModalFunction = () => setShowExitModal(!showExitModal);

  /**
   * Go to wallet page
   */
  const goToWalletPage = () => {
    navigation.navigate(Routes.WALLET.HOME, {
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: {
        screen: Routes.WALLET_VIEW,
      },
    });
  };

  const updateNavBar = useCallback(() => {
    navigation.setOptions(
      getImportTokenNavbarOptions(
        `add_asset.${TOKEN_TITLE}`,
        false,
        navigation,
        colors,
        true,
        0,
        () => setShowExitModal(true),
      ),
    );
  }, [colors, navigation]);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  const renderImportModal = () => (
    <Modal
      isVisible={showExitModal}
      onBackdropPress={() => setShowExitModal(false)}
      onSwipeComplete={() => setShowExitModal(false)}
      swipeDirection="down"
      propagateSwipe
      avoidKeyboard
      style={styles.bottomModal}
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
    >
      <View
        style={styles.box}
        {...generateTestId(Platform, ADD_CANCEL_ADD_CUSTOM_ASSET_MODAL)}
      >
        <View style={styles.notch} />
        <SheetHeader title={strings('wallet.are_you_sure_exit')} />

        <Box style={styles.boxContent}>
          <Text style={styles.title}>
            {strings('wallet.search_information_not_saved')}
          </Text>
        </Box>
        <Box style={styles.boxContent}>
          <BottomSheetFooter
            buttonPropsArray={[
              {
                onPress: showExitModalFunction,
                label: strings('confirmation_modal.cancel_cta'),
                variant: ButtonVariants.Secondary,
                size: ButtonSize.Lg,
              },
              {
                onPress: goToWalletPage,
                label: strings('confirmation_modal.confirm_cta'),
                variant: ButtonVariants.Primary,
                size: ButtonSize.Lg,
              },
            ]}
            buttonsAlignment={ButtonsAlignment.Horizontal}
          />
        </Box>
      </View>
    </Modal>
  );

  const NetworkBadgeSource = () => {
    if (isTestNet(chainId)) return getTestNetImageByChainId(chainId);

    if (isMainNet(chainId)) return images.ETHEREUM;

    if (isLineaMainnet(chainId)) return images['LINEA-MAINNET'];

    return ticker ? images[ticker] : undefined;
  };

  return (
    <View
      style={styles.rowWrapper}
      {...generateTestId(Platform, ADD_CONFIRM_CUSTOM_ASSET)}
    >
      <Text variant={TextVariant.BodyMD} style={styles.title}>
        {strings('wallet.import_token')}
      </Text>
      <ScrollView style={styles.root}>
        {selectedAsset.map(
          (
            asset: {
              symbol: string;
              address: string;
              iconUrl: string;
              name: string;
              decimals: number;
            },
            i: number,
          ) => (
            <View style={styles.assetElement} key={i}>
              <View>
                <BadgeWrapper
                  badgeElement={
                    <Badge
                      variant={BadgeVariant.Network}
                      imageSource={NetworkBadgeSource()}
                      name={networkName}
                    />
                  }
                >
                  <AssetIcon
                    address={asset.address}
                    logo={asset.iconUrl}
                    customStyle={styles.assetIcon}
                  />
                </BadgeWrapper>
              </View>

              <View>
                <Text variant={TextVariant.BodyLGMedium}>{asset.name}</Text>
                <Text variant={TextVariant.BodyMD} style={styles.symbolText}>
                  {asset.symbol}
                </Text>
              </View>
              <RenderBalance {...asset} />
            </View>
          ),
        )}
      </ScrollView>

      <View style={styles.bottomContainer}>
        <BottomSheetFooter
          buttonPropsArray={[
            {
              onPress: showExitModalFunction,
              label: strings('confirmation_modal.cancel_cta'),
              variant: ButtonVariants.Secondary,
              size: ButtonSize.Lg,
            },
            {
              onPress: () => {
                addTokenList();
              },
              label: strings('swaps.Import'),
              variant: ButtonVariants.Primary,
              size: ButtonSize.Lg,
            },
          ]}
          buttonsAlignment={ButtonsAlignment.Horizontal}
          style={styles.button}
        />
      </View>
      {renderImportModal()}
    </View>
  );
};
export default ConfirmAddAsset;
