import React, { useCallback, useMemo } from 'react';
import { Image } from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextButton,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { CaipAssetType, parseCaipAssetType } from '@metamask/utils';
import { formatChainIdToHex } from '@metamask/bridge-controller';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { useAssetFromTheme } from '../../../../../util/theme';
import { isNonEvmChainId } from '../../../../../core/Multichain/utils';
import emptyStateDefiLight from '../../../../../images/empty-state-defi-light.png';
import emptyStateDefiDark from '../../../../../images/empty-state-defi-dark.png';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import { getAssetsInfo } from '../../../../../selectors/assets/assets-controller';
import { selectMultichainAssetsMetadata } from '../../../../../selectors/multichain/multichain';
import { createCaipAssetImageUrl } from '../../../../UI/TokenDetails/components/useAssetVisibility';
import { getCaipChainIdFromAssetId } from '../../../../UI/Trending/components/TrendingTokenRowItem/utils';
import { ImportAsset } from '../../utils/utils';
import { useHiddenAssetIds } from '../../hooks/useHiddenAssetIds';
import AddAssetTokenRow from '../../components/AddAssetTokenRow/AddAssetTokenRow';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';

interface HiddenAssetRow {
  assetId: CaipAssetType;
  asset: ImportAsset;
}

const getShortAssetLabel = (assetId: CaipAssetType): string => {
  const { assetReference } = parseCaipAssetType(assetId);
  return assetReference.length > 12
    ? `${assetReference.slice(0, 6)}...${assetReference.slice(-4)}`
    : assetReference;
};

// Hidden assets aren't refreshed, so only stored metadata is available.

const useHiddenAssetRows = (): HiddenAssetRow[] => {
  const assetsInfo = useSelector(getAssetsInfo);
  const multichainMetadata = useSelector(selectMultichainAssetsMetadata);
  const hiddenAssetIds = useHiddenAssetIds();

  return useMemo(
    () =>
      hiddenAssetIds.map((id): HiddenAssetRow => {
        const assetId = id as CaipAssetType;
        const chain = getCaipChainIdFromAssetId(assetId);
        const info = assetsInfo[assetId];
        const multichain = multichainMetadata?.[assetId];

        const symbol =
          info?.symbol || multichain?.symbol || getShortAssetLabel(assetId);
        const name = info?.name || multichain?.name || symbol;

        return {
          assetId,
          asset: {
            address: assetId,
            symbol,
            name,
            decimals: info?.decimals ?? multichain?.units?.[0]?.decimals ?? 0,
            image:
              info?.image ||
              multichain?.iconUrl ||
              createCaipAssetImageUrl(assetId),
            chainId: isNonEvmChainId(chain) ? chain : formatChainIdToHex(chain),
          },
        };
      }),
    [hiddenAssetIds, assetsInfo, multichainMetadata],
  );
};

const HiddenTokensView = () => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const emptyImage = useAssetFromTheme(emptyStateDefiLight, emptyStateDefiDark);
  const rows = useHiddenAssetRows();

  const handleUnhide = useCallback(async (assetId: CaipAssetType) => {
    try {
      await Engine.context.AssetsController.unhideAsset(assetId);
    } catch (error) {
      Logger.error(error as Error, 'HiddenTokensView: unhideAsset failed');
    }
  }, []);

  const renderItem = useCallback<ListRenderItem<HiddenAssetRow>>(
    ({ item }) => (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={3}
        twClassName="px-4"
      >
        <Box twClassName="flex-1">
          <AddAssetTokenRow asset={item.asset} />
        </Box>
        <TextButton
          onPress={() => handleUnhide(item.assetId)}
          testID={ImportTokenViewSelectorsIDs.UNHIDE_BUTTON}
        >
          {strings('add_asset.unhide')}
        </TextButton>
      </Box>
    ),
    [handleUnhide],
  );

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={tw.style('flex-1 bg-default', { paddingTop: insets.top })}
      testID={ImportTokenViewSelectorsIDs.HIDDEN_TOKENS_CONTAINER}
    >
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        title={strings('add_asset.hidden_tokens')}
        onBack={() => navigation.goBack()}
      />
      {rows.length === 0 ? (
        <Box
          twClassName="flex-1 items-center justify-center px-8"
          testID={ImportTokenViewSelectorsIDs.HIDDEN_EMPTY_STATE}
        >
          <Image
            source={emptyImage}
            resizeMode="contain"
            style={tw.style('h-[72px] w-[72px]')}
          />
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="mt-4 text-center"
          >
            {strings('add_asset.no_hidden_tokens')}
          </Text>
        </Box>
      ) : (
        <FlashList
          data={rows}
          renderItem={renderItem}
          keyExtractor={(item) => item.assetId}
        />
      )}
    </SafeAreaView>
  );
};

export default HiddenTokensView;
