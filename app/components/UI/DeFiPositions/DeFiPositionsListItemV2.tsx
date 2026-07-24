import React, { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import type { DeFiProtocolPositionGroup } from '@metamask/assets-controllers';
import { useNavigation } from '@react-navigation/native';
import type { Hex } from '@metamask/utils';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../component-library/components/Texts/SensitiveText';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import I18n, { strings } from '../../../../locales/i18n';
import { formatWithThreshold } from '../../../util/assets';
import AvatarGroup from '../../../component-library/components/Avatars/AvatarGroup';
import type { AvatarProps } from '../../../component-library/components/Avatars/Avatar/Avatar.types';
import DeFiAvatarWithBadge from './DeFiAvatarWithBadge';
import styleSheet from './DeFiPositionsListItem.styles';
import { NetworkBadgeSource } from '../AssetOverview/Balance/Balance';
import { useStyles } from '../../hooks/useStyles';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { WalletViewSelectorsIDs } from '../../Views/Wallet/WalletView.testIds';
import { getMaybeHexChainId } from '../../../util/bridge';

interface DeFiPositionsListItemV2Props {
  position: DeFiProtocolPositionGroup;
  privacyMode: boolean;
}

const DeFiPositionsListItemV2: React.FC<DeFiPositionsListItemV2Props> = ({
  position,
  privacyMode,
}) => {
  const { styles } = useStyles(styleSheet, undefined);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const navigation = useNavigation();

  const hexChainId = useMemo(
    () => getMaybeHexChainId(position.chainId),
    [position.chainId],
  );

  const networkIconAvatar = useMemo(
    () => (hexChainId ? NetworkBadgeSource(hexChainId as Hex) : undefined),
    [hexChainId],
  );

  const {
    tokenAvatars,
    tokenNames,
  }: { tokenAvatars: AvatarProps[]; tokenNames: string } = useMemo(() => {
    const icons = position.iconGroup;

    const getTokenStringFromLength: Record<string, () => string> = {
      0: () => '',
      1: () =>
        strings('defi_positions.single_token', {
          symbol: icons[0]?.symbol,
        }),
      2: () =>
        strings('defi_positions.two_tokens', {
          symbol: icons[0]?.symbol,
        }),
      multiple: () =>
        strings('defi_positions.multiple_tokens', {
          symbol: icons[0]?.symbol,
          count: icons.length - 1,
        }),
    };

    const tokenStr =
      getTokenStringFromLength[icons.length] ??
      getTokenStringFromLength.multiple;

    return {
      tokenAvatars: icons.map((icon) => ({
        variant: AvatarVariant.Token,
        name: icon.symbol,
        imageSource: icon.avatarValue
          ? {
              uri: icon.avatarValue,
            }
          : undefined,
      })),
      tokenNames: tokenStr(),
    };
  }, [position.iconGroup]);

  const title = position.protocolId;

  return (
    <TouchableOpacity
      testID={WalletViewSelectorsIDs.DEFI_POSITION_LIST_ITEM(title)}
      onPress={() => {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.DEFI_PROTOCOL_DETAILS_OPENED)
            .addProperties({
              chain_id: position.chainId,
              protocol_id: position.protocolId,
            })
            .build(),
        );

        navigation.navigate('DeFiProtocolPositionDetails', {
          protocolPositionGroup: position,
          networkIconAvatar,
        });
      }}
      style={styles.listItemWrapper}
    >
      <DeFiAvatarWithBadge
        networkIconAvatar={networkIconAvatar}
        avatarName={title}
        avatarIconUrl={position.protocolIconUrl}
      />

      <View style={styles.contentWrapper}>
        <Text variant={TextVariant.BodyMDMedium}>{title}</Text>
        <Text variant={TextVariant.BodySMMedium} color={TextColor.Alternative}>
          {tokenNames}
        </Text>
      </View>

      <View style={styles.balance}>
        <SensitiveText
          variant={TextVariant.BodyMDMedium}
          isHidden={privacyMode}
          length={SensitiveTextLength.Medium}
        >
          {formatWithThreshold(position.marketValue, 0.01, I18n.locale, {
            style: 'currency',
            currency: 'USD',
          })}
        </SensitiveText>
        <AvatarGroup avatarPropsList={tokenAvatars} size={AvatarSize.Xs} />
      </View>
    </TouchableOpacity>
  );
};

export default DeFiPositionsListItemV2;
