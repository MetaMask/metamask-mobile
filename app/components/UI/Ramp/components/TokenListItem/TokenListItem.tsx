import React, { useCallback } from 'react';
import { DepositCryptoCurrency } from '@consensys/native-ramps-sdk';

import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import BadgeNetwork from '../../../../../component-library/components/Badges/Badge/variants/BadgeNetwork';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';

import { useTokenNetworkInfo } from '../../hooks/useTokenNetworkInfo';

interface TokenListItemProps {
  token: DepositCryptoCurrency;
  isSelected?: boolean;
  onPress: () => void;
  textColor?: string;
  isDisabled?: boolean;
  onInfoPress?: () => void;
}

function TokenListItem({
  token,
  isSelected,
  onPress,
  textColor = TextColor.Alternative,
  isDisabled = false,
  onInfoPress,
}: Readonly<TokenListItemProps>) {
  const getTokenNetworkInfo = useTokenNetworkInfo();
  const { networkName, depositNetworkName, networkImageSource } =
    getTokenNetworkInfo(token.chainId);

  const handleInfoPress = useCallback(() => {
    onInfoPress?.();
  }, [onInfoPress]);

  return (
    <ListItemSelect
      isSelected={isSelected}
      onPress={onPress}
      isDisabled={isDisabled}
      testID={`token-list-item-${token.assetId}`}
    >
      <ListItemColumn widthType={WidthType.Auto}>
        <BadgeWrapper
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            <BadgeNetwork
              name={depositNetworkName ?? networkName}
              imageSource={networkImageSource}
            />
          }
        >
          <AvatarToken
            name={token.name}
            imageSource={{ uri: token.iconUrl }}
            size={AvatarSize.Md}
          />
        </BadgeWrapper>
      </ListItemColumn>
      <ListItemColumn widthType={WidthType.Fill}>
        <Text variant={TextVariant.BodyLGMedium}>{token.name}</Text>
        <Text variant={TextVariant.BodyMD} color={textColor}>
          {token.symbol}
        </Text>
      </ListItemColumn>
      {isDisabled && onInfoPress && (
        <ListItemColumn widthType={WidthType.Auto}>
          <ButtonIcon
            size={ButtonIconSize.Md}
            iconName={IconName.Info}
            onPress={handleInfoPress}
            testID="token-unsupported-info-button"
          />
        </ListItemColumn>
      )}
    </ListItemSelect>
  );
}

export default TokenListItem;
