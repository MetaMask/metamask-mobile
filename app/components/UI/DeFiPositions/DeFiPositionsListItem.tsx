import React, { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Text, {
  TextColor,
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
import I18n, { strings } from '../../../../locales/i18n';
import { formatWithThreshold } from '../../../util/assets';
import AvatarGroup from '../../../component-library/components/Avatars/AvatarGroup';
import { AvatarProps } from '../../../component-library/components/Avatars/Avatar/Avatar.types';
import DeFiAvatarWithBadge from './DeFiAvatarWithBadge';
import styleSheet from './DeFiPositionsListItem.styles';
import { NetworkBadgeSource } from '../TokenDetails/components/AssetOverview/Balance/Balance';
import { useStyles } from '../../hooks/useStyles';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';
import { getTokenAvatarUrl } from './get-token-avatar-url';

interface DeFiPositionsListItemProps {
  chainId: Hex;
  protocolId: string;
  protocolAggregate: GroupedDeFiPositions['protocols'][number];
  privacyMode: boolean;
}

const DeFiPositionsListItem: React.FC<DeFiPositionsListItemProps> = ({
  chainId,
  protocolId,
  protocolAggregate,
  privacyMode,
}: DeFiPositionsListItemProps) => {
  const { styles } = useStyles(styleSheet, undefined);

  const { trackEvent, createEventBuilder } = useMetrics();
  const navigation = useNavigation();

  const networkIconAvatar = useMemo(
    () => NetworkBadgeSource(chainId),
    [chainId],
  );

  const {
    tokenAvatars,
    tokenNames,
  }: { tokenAvatars: AvatarProps[]; tokenNames: string } = useMemo(() => {
    const seenAvatar = new Set<string>();
    const allTokens = Object.values(protocolAggregate.positionTypes).flatMap(
      (displayTokens) =>
        displayTokens.positions.flatMap((nestedToken) =>
          nestedToken.flatMap((token) =>
            // Avoid duplicate avatars
            token.tokens.filter((underlying) => {
              if (seenAvatar.has(underlying.iconUrl)) {
                return false;
              }
              seenAvatar.add(underlying.iconUrl);
              return true;
            }),
          ),
        ),
    );

    const sortedTokens = allTokens.sort((a, b) => {
      const aMarketValue = a.marketValue ?? 0;
      const bMarketValue = b.marketValue ?? 0;
      return bMarketValue - aMarketValue;
    });

    const getTokenStringFromLength: Record<string, () => string> = {
      0: () => '',
      1: () =>
        strings('defi_positions.single_token', {
          symbol: sortedTokens[0].symbol,
        }),
      2: () =>
        strings('defi_positions.two_tokens', {
          symbol: sortedTokens[0].symbol,
        }),
      multiple: () =>
        strings('defi_positions.multiple_tokens', {
          symbol: sortedTokens[0].symbol,
          count: sortedTokens.length - 1,
        }),
    };

    const tokenStr =
      getTokenStringFromLength[sortedTokens.length] ??
      getTokenStringFromLength.multiple;

    return {
      tokenAvatars: sortedTokens.map((token) => ({
        variant: AvatarVariant.Token,
        name: token.name,
        imageSource: {
          uri: getTokenAvatarUrl(token),
        },
      })),
      tokenNames: tokenStr(),
    };
  }, [protocolAggregate]);

  return (
    <TouchableOpacity
      onPress={() => {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.DEFI_PROTOCOL_DETAILS_OPENED)
            .addProperties({
              chain_id: chainId,
              protocol_id: protocolId,
            })
            .build(),
        );

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

      <View style={styles.contentWrapper}>
        <Text variant={TextVariant.BodyLGMedium}>
          {protocolAggregate.protocolDetails.name}
        </Text>
        <Text variant={TextVariant.BodySMMedium} color={TextColor.Alternative}>
          {tokenNames}
        </Text>
      </View>

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
