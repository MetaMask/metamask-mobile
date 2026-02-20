import React, { useCallback, useEffect } from 'react';
import { Platform, SafeAreaView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useParams } from '../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import getHeaderCompactStandardNavbarOptions from '../../../../../component-library/components-temp/HeaderCompactStandard/getHeaderCompactStandardNavbarOptions';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import Routes from '../../../../../constants/navigation/Routes';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';
import { Hex } from '@metamask/utils';
import { NetworkBadgeSource } from '../../../../UI/AssetOverview/Balance/Balance';
import { BridgeToken } from '../../../../UI/Bridge/types';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { FlashList } from '@shopify/flash-list';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';

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

  const tw = useTailwind();
  const navigation = useNavigation();

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
      getHeaderCompactStandardNavbarOptions({
        title: strings(`add_asset.title`),
        onBack: () => navigation.goBack(),
        includesTopInset: true,
      }),
    );
  }, [navigation]);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  return (
    <SafeAreaView
      style={tw.style('flex-1 py-4 bg-default')}
      testID={ImportTokenViewSelectorsIDs.ADD_CONFIRM_CUSTOM_ASSET}
    >
      <Text variant={TextVariant.BodyMd} style={tw.style('text-center')}>
        {selectedAsset.length > 1
          ? strings('wallet.import_tokens')
          : strings('wallet.import_token')}
      </Text>

      <FlashList
        data={selectedAsset}
        style={tw.style('bg-default p-4')}
        renderItem={({ item: asset, index }) => {
          const imageUrl =
            asset.image ??
            ('iconUrl' in asset ? (asset.iconUrl as string) : undefined);

          return (
            <Box
              key={index}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="mr-2.5 gap-5 py-2.5"
            >
              <Box>
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
                  {imageUrl && (
                    <AvatarToken
                      name={asset.symbol}
                      imageSource={{ uri: imageUrl }}
                      size={AvatarSize.Lg}
                    />
                  )}
                </BadgeWrapper>
              </Box>

              <Box>
                <Text variant={TextVariant.BodyLg}>{asset.name}</Text>
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                  style={tw.style('uppercase')}
                >
                  {asset.symbol}
                </Text>
              </Box>
            </Box>
          );
        }}
        keyExtractor={(_, index) => `token-search-row-${index}`}
      />

      <BottomSheetFooter
        buttonPropsArray={[
          {
            onPress: () => navigation.goBack(),
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
        style={tw.style('px-4 pt-6', Platform.OS !== 'android' && 'pb-4')}
      />
    </SafeAreaView>
  );
};
export default ConfirmAddAsset;
