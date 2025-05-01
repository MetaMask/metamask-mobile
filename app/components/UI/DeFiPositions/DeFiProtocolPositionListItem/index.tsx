/* eslint-disable react/prop-types */
import React, { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../component-library/components/Texts/SensitiveText';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import { useNavigation } from '@react-navigation/native';
import { Hex } from '@metamask/utils';
import { getDefaultNetworkByChainId } from '../../../../util/networks';
import {
  CustomNetworkImgMapping,
  PopularList,
  UnpopularNetworkList,
} from '../../../../util/networks/customNetworks';
import { GroupedDeFiPositions } from '@metamask/assets-controllers';
import AvatarToken from '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import createStyles from '../styles';
import I18n from '../../../../../locales/i18n';
import { formatWithThreshold } from '../../../../util/assets';
import AvatarGroup from '../../../../component-library/components/Avatars/AvatarGroup';
import { AvatarProps } from '../../../../component-library/components/Avatars/Avatar/Avatar.types';

interface DeFiProtocolPositionListItemProps {
  chainId: Hex;
  protocolAggregate: GroupedDeFiPositions['protocols'][number];
  privacyMode?: boolean;
}

const DeFiProtocolPositionListItem = ({
  chainId,
  protocolAggregate,
  privacyMode = false,
}: DeFiProtocolPositionListItemProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const navigation = useNavigation();

  const networkIconAvatar = useMemo(() => {
    const defaultNetwork = getDefaultNetworkByChainId(chainId) as
      | {
          imageSource: string;
        }
      | undefined;

    if (defaultNetwork) {
      return defaultNetwork.imageSource;
    }

    const unpopularNetwork = UnpopularNetworkList.find(
      (networkConfig) => networkConfig.chainId === chainId,
    );

    const popularNetwork = PopularList.find(
      (networkConfig) => networkConfig.chainId === chainId,
    );

    const network = unpopularNetwork || popularNetwork;
    if (network) {
      return network.rpcPrefs.imageSource;
    }

    const customNetworkImg = CustomNetworkImgMapping[chainId];
    if (customNetworkImg) {
      return customNetworkImg;
    }
  }, [chainId]);

  const tokenAvatars: AvatarProps[] = useMemo(
    () =>
      Object.values(protocolAggregate.positionTypes).flatMap((displayTokens) =>
        displayTokens.positions.flatMap((nestedToken) =>
          nestedToken.flatMap((token) =>
            token.tokens.map((underlying) => ({
              variant: AvatarVariant.Token,
              name: underlying.name,
              imageSource: {
                uri: underlying.iconUrl,
              },
            })),
          ),
        ),
      ),
    [protocolAggregate],
  );

  return (
    <TouchableOpacity
      onPress={() => {
        navigation.navigate('DeFiProtocolPositionsDetails', {
          protocolAggregate,
          networkIconAvatar,
        });
      }}
      style={styles.itemWrapper}
    >
      <BadgeWrapper
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            imageSource={networkIconAvatar}
          />
        }
      >
        <AvatarToken
          name={protocolAggregate.protocolDetails.name}
          imageSource={{ uri: protocolAggregate.protocolDetails.iconUrl }}
          size={AvatarSize.Md}
        />
      </BadgeWrapper>

      <View style={styles.balances}>
        <View style={styles.assetName}>
          <Text variant={TextVariant.BodyLGMedium}>
            {protocolAggregate.protocolDetails.name}
          </Text>
        </View>
      </View>

      <View style={styles.arrow}>
        <SensitiveText
          variant={TextVariant.BodyLGMedium}
          isHidden={privacyMode}
          length={SensitiveTextLength.Medium}
        >
          {formatWithThreshold(
            protocolAggregate.aggregatedMarketValue,
            0.01,
            I18n.locale,
            { style: 'currency', currency: 'USD' },
          )}
        </SensitiveText>
        <AvatarGroup avatarPropsList={tokenAvatars} size={AvatarSize.Xs} />
      </View>
    </TouchableOpacity>
  );
};
export default DeFiProtocolPositionListItem;
