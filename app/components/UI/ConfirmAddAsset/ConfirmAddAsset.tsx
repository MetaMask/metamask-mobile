import React, { useCallback, useEffect } from 'react';
import { View, SafeAreaView } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { useParams } from '../../../util/navigation/navUtils';
import createStyles from './styles';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import getHeaderCenterNavbarOptions from '../../../component-library/components-temp/HeaderCenter/getHeaderCenterNavbarOptions';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../component-library/components/Badges/BadgeWrapper';
import AssetIcon from '../AssetIcon';
import SkeletonText from '../Ramp/Aggregator/components/SkeletonText';
import { TOKEN_BALANCE_LOADING } from '../Tokens/constants';
import useBalance from '../Ramp/Aggregator/hooks/useBalance';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ScrollView } from 'react-native-gesture-handler';
import Modal from 'react-native-modal';
import Box from '../Ramp/Aggregator/components/Box';
import HeaderCenter from '../../../component-library/components-temp/HeaderCenter';
import Routes from '../../../constants/navigation/Routes';
import { ImportTokenViewSelectorsIDs } from '../../Views/AddAsset/ImportTokenView.testIds';
import { TOKEN_TITLE } from '../../../components/Views/AddAsset/AddAsset.constants';
import { Hex } from '@metamask/utils';
import { NetworkBadgeSource } from '../AssetOverview/Balance/Balance';
import { BridgeToken } from '../Bridge/types';
import { toHex } from '../../../core/Delegation/utils';
import { isNonEvmAddress } from '../../../core/Multichain/utils';

const RenderBalance = (
  asset:
    | BridgeToken
    | {
        symbol: string;
        address: string;
        iconUrl: string;
        name: string;
        decimals: number;
      },
) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const { balanceFiat } = useBalance(
    asset
      ? {
          address: isNonEvmAddress(asset.address)
            ? toHex(asset.address)
            : asset.address,
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
          (balanceFiat ?? '')
        )}
      </Text>
    </View>
  );
};

const ConfirmAddAsset = () => {
  const { selectedAsset, networkName, addTokenList } = useParams<{
    selectedAsset:
      | BridgeToken[]
      | {
          symbol: string;
          address: string;
          iconUrl: string;
          name: string;
          decimals: number;
          chainId: Hex;
        }[];
    networkName: string;
    addTokenList: () => void;
  }>();

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
      getHeaderCenterNavbarOptions({
        title: strings(`add_asset.${TOKEN_TITLE}`),
        onBack: () => setShowExitModal(true),
        includesTopInset: true,
      }),
    );
  }, [navigation]);

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
      <SafeAreaView
        style={styles.box}
        testID={ImportTokenViewSelectorsIDs.ADD_CANCEL_ADD_CUSTOM_ASSET_MODAL}
      >
        <View style={styles.notch} />
        <HeaderCenter
          title={strings('wallet.are_you_sure_exit')}
          onClose={() => setShowExitModal(false)}
        />

        <Box style={styles.boxContent}>
          <Text color={TextColor.Alternative}>
            {strings('wallet.search_information_not_saved')}
          </Text>
        </Box>
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
          style={styles.modalFooterContainer}
        />
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView
      style={styles.rowWrapper}
      testID={ImportTokenViewSelectorsIDs.ADD_CONFIRM_CUSTOM_ASSET}
    >
      <Text variant={TextVariant.BodyMD} style={styles.title}>
        {strings('wallet.import_token')}
      </Text>
      <ScrollView style={styles.root}>
        {selectedAsset?.map((asset, i) => (
          <View style={styles.assetElement} key={i}>
            <View>
              <BadgeWrapper
                badgePosition={BadgePosition.BottomRight}
                badgeElement={
                  <Badge
                    variant={BadgeVariant.Network}
                    imageSource={NetworkBadgeSource(asset.chainId as Hex)}
                    name={networkName}
                  />
                }
              >
                {(() => {
                  const assetImage = 'image' in asset ? asset.image : undefined;
                  const assetIconUrl =
                    'iconUrl' in asset ? asset.iconUrl : undefined;
                  const logo = assetImage || assetIconUrl;

                  return (
                    logo && (
                      <AssetIcon
                        address={asset.address}
                        logo={logo}
                        customStyle={styles.assetIcon}
                      />
                    )
                  );
                })()}
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
        ))}
      </ScrollView>

      <BottomSheetFooter
        buttonPropsArray={[
          {
            onPress: showExitModalFunction,
            label: strings('confirmation_modal.cancel_cta'),
            variant: ButtonVariants.Secondary,
            size: ButtonSize.Lg,
          },
          {
            onPress: async () => {
              await addTokenList();
              goToWalletPage();
            },
            label: strings('swaps.Import'),
            variant: ButtonVariants.Primary,
            size: ButtonSize.Lg,
          },
        ]}
        buttonsAlignment={ButtonsAlignment.Horizontal}
        style={styles.buttonContainer}
      />
      {renderImportModal()}
    </SafeAreaView>
  );
};
export default ConfirmAddAsset;
