/* eslint-disable react/prop-types */
import React, { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../component-library/components/Texts/SensitiveText';
import { useNavigation } from '@react-navigation/native';
import { Hex } from '@metamask/utils';
import { GroupedDeFiPositions } from '@metamask/assets-controllers';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import I18n from '../../../../locales/i18n';
import { formatWithThreshold } from '../../../util/assets';
import AvatarGroup from '../../../component-library/components/Avatars/AvatarGroup';
import { AvatarProps } from '../../../component-library/components/Avatars/Avatar/Avatar.types';
import DeFiAvatarWithBadge from './DeFiAvatarWithBadge';
import { getDefaultNetworkByChainId } from '../../../util/networks';
import {
  CustomNetworkImgMapping,
  PopularList,
  UnpopularNetworkList,
} from '../../../util/networks/customNetworks';
import styleSheet from './DeFiPositionsListItem.styles';

interface DeFiPositionsListItemProps {
  chainId: Hex;
  protocolAggregate: GroupedDeFiPositions['protocols'][number];
  privacyMode?: boolean;
}

const DeFiPositionsListItem: React.FC<DeFiPositionsListItemProps> = ({
  chainId,
  protocolAggregate,
  privacyMode = false,
}: DeFiPositionsListItemProps) => {
  const styles = styleSheet();

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
        navigation.navigate('DeFiProtocolPositionDetails', {
          protocolAggregate,
          networkIconAvatar,
        });
      }}
      style={styles.listItemWrapper}
    >
      <DeFiAvatarWithBadge
        networkIconAvatar={networkIconAvatar}
        avatarName={protocolAggregate.protocolDetails.name}
        avatarIconUrl={protocolAggregate.protocolDetails.iconUrl}
      />

      <Text style={styles.protocolNameText} variant={TextVariant.BodyLGMedium}>
        {protocolAggregate.protocolDetails.name}
      </Text>

      <View style={styles.balance}>
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
export default DeFiPositionsListItem;
