import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import createStyles from './styles';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import { getImportTokenNavbarOptions } from '../Navbar';
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
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Routes from '../../../constants/navigation/Routes';
import { ImportTokenViewSelectorsIDs } from '../../../../e2e/selectors/wallet/ImportTokenView.selectors';
import { TOKEN_TITLE } from '../../../components/Views/AddAsset/AddAsset.constants';
import { Hex } from '@metamask/utils';
import { NetworkBadgeSource } from '../AssetOverview/Balance/Balance';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../util/navigation';

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

type ConfirmAddAssetProps = StackScreenProps<RootParamList, 'ConfirmAddAsset'>;

const ConfirmAddAsset = ({ route }: ConfirmAddAssetProps) => {
  const { selectedAsset, networkName, addTokenList } = route.params;

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
      screen: Routes.WALLET_VIEW,
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
        testID={ImportTokenViewSelectorsIDs.ADD_CANCEL_ADD_CUSTOM_ASSET_MODAL}
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

  return (
    <View
      style={styles.rowWrapper}
      testID={ImportTokenViewSelectorsIDs.ADD_CONFIRM_CUSTOM_ASSET}
    >
      <Text variant={TextVariant.BodyMD} style={styles.title}>
        {strings('wallet.import_token')}
      </Text>
      <ScrollView style={styles.root}>
        {selectedAsset?.map(
          (
            asset: {
              symbol: string;
              address: string;
              iconUrl: string;
              name: string;
              decimals: number;
              chainId: string;
            },
            i: number,
          ) => (
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
          style={styles.button}
        />
      </View>
      {renderImportModal()}
    </View>
  );
};
export default ConfirmAddAsset;
