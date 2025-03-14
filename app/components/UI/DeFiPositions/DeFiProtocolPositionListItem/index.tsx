import React, { useMemo } from 'react';
import { ImageSourcePropType, View } from 'react-native';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  selectEvmTicker,
  selectNetworkConfigurationByChainId,
} from '../../../../selectors/networkController';
import { useTheme } from '../../../../util/theme';
import { RootState } from '../../../../reducers';
import { PositionType } from '@metamask/assets-controllers/dist/DeFiPositionsController/fetch-positions.cjs';
import { ProtocolTokenWithMarketValue } from '@metamask/assets-controllers/dist/DeFiPositionsController/group-positions.cjs';
import {
  isLineaMainnetByChainId,
  isMainnetByChainId,
} from '../../../../util/networks';
import createStyles from '../styles';
import { getTestNetImageByChainId, isTestNet } from '../../../../util/networks';
import images from 'images/image-icons';
import { CustomNetworkImgMapping } from '../../../../util/networks/customNetworks';
import BadgeWrapper from '../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import AssetElement from '../../AssetElement';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';

interface DeFiProtocolPositionListItemProps {
  chainId: Hex;
  protocolId: string;
  protocolDetails: { name: string; iconUrl: string };
  aggregatedMarketValue: number;
  positionTypes: {
    [key in PositionType]?: {
      aggregatedMarketValue: number;
      positions: ProtocolTokenWithMarketValue[][];
    };
  };
  privacyMode: boolean;
}

export const DeFiProtocolPositionListItem = React.memo(
  ({
    chainId,
    protocolId,
    protocolDetails: { name, iconUrl },
    aggregatedMarketValue,
    positionTypes,
    privacyMode,
  }: DeFiProtocolPositionListItemProps) => {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const styles = createStyles(colors);

    const ticker = useSelector(selectEvmTicker);

    const networkConfigurationByChainId = useSelector((state: RootState) =>
      selectNetworkConfigurationByChainId(state, chainId),
    );

    const isMainnet = isMainnetByChainId(chainId);
    const isLineaMainnet = isLineaMainnetByChainId(chainId);

    const onItemPress = (
      protocolId: string,
      protocolDetails: { name: string; iconUrl: string },
      aggregatedMarketValue: number,
      positionTypes: {
        [key in PositionType]?: {
          aggregatedMarketValue: number;
          positions: ProtocolTokenWithMarketValue[][];
        };
      },
      privacyMode: boolean,
    ) => {
      navigation.navigate('DeFiPositions', {
        protocolId,
        protocolDetails,
        aggregatedMarketValue,
        positionTypes,
        privacyMode,
      });
    };

    const networkBadgeSource = useMemo<ImageSourcePropType>(() => {
      if (isTestNet(chainId)) {
        return getTestNetImageByChainId(chainId);
      }

      if (isMainnet) {
        return images.ETHEREUM;
      }

      if (isLineaMainnet) return images['LINEA-MAINNET'];

      if (CustomNetworkImgMapping[chainId]) {
        return CustomNetworkImgMapping[chainId];
      }

      return ticker ? images[ticker] : undefined;
    }, [chainId, isMainnet, isLineaMainnet, ticker]);

    const badge = useMemo(() => {
      return (
        <BadgeWrapper
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              imageSource={networkBadgeSource}
              name={networkConfigurationByChainId?.name}
            />
          }
        >
          <AvatarToken
            name={name}
            imageSource={{ uri: iconUrl }}
            size={AvatarSize.Md}
          />
        </BadgeWrapper>
      );
    }, [name, iconUrl]);

    return (
      <AssetElement
        key={protocolId}
        onPress={() =>
          onItemPress(
            protocolId,
            { name, iconUrl },
            aggregatedMarketValue,
            positionTypes,
            privacyMode,
          )
        }
        onLongPress={null}
        asset={{} as any}
        balance={aggregatedMarketValue.toString()}
        privacyMode={privacyMode}
      >
        {badge}
        <View style={styles.balances}>
          <View style={styles.assetName}>
            <Text variant={TextVariant.BodyLGMedium}>{name}</Text>
          </View>
        </View>
      </AssetElement>
    );
  },
);
