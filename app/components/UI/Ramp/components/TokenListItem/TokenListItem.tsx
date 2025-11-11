import React from 'react';
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
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

import { useTokenNetworkInfo } from '../../hooks/useTokenNetworkInfo';

interface TokenListItemProps {
  token: DepositCryptoCurrency;
  isSelected: boolean;
  onPress: () => void;
  textColor?: string;
  isDisabled?: boolean;
}

function TokenListItem({
  token,
  isSelected,
  onPress,
  textColor,
  isDisabled = false,
}: Readonly<TokenListItemProps>) {
  const getTokenNetworkInfo = useTokenNetworkInfo();
  const { networkName, depositNetworkName, networkImageSource } =
    getTokenNetworkInfo(token.chainId);

  return (
    <ListItemSelect
      isSelected={isSelected}
      onPress={onPress}
      isDisabled={isDisabled}
      accessibilityRole="button"
      accessible
    >
      <ListItemColumn widthType={WidthType.Auto}>
        <BadgeWrapper
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            <BadgeNetwork name={networkName} imageSource={networkImageSource} />
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
        <Text variant={TextVariant.BodyLGMedium}>{token.symbol}</Text>
        <Text variant={TextVariant.BodyMD} color={textColor}>
          {depositNetworkName ?? networkName}
        </Text>
      </ListItemColumn>
    </ListItemSelect>
  );
}

export default TokenListItem;
