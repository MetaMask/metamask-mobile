import React, { useMemo } from 'react';
import {
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  FontWeight,
  ListItem,
  TextColor,
} from '@metamask/design-system-react-native';
import { getNetworkImageSource } from '../../../../../util/networks';
import { getTokenImageSource } from '../../utils';
import { OpenOrderRowSelectorsIDs } from './OpenOrderRow.testIds';
import type { OpenOrderRowProps } from './OpenOrderRow.types';

function OpenOrderRow({
  token,
  title,
  subtitle,
  primaryValue,
  secondaryValue,
  primaryColor = TextColor.TextDefault,
  subtitleFontWeight = FontWeight.Regular,
  onPress,
  testID = OpenOrderRowSelectorsIDs.CONTAINER,
}: OpenOrderRowProps) {
  const tokenImageSource = useMemo(
    () =>
      getTokenImageSource(
        token.symbol,
        token.image,
        token.address,
        token.chainId,
      ),
    [token.address, token.chainId, token.image, token.symbol],
  );

  const networkImageSource = useMemo(
    () => getNetworkImageSource({ chainId: token.chainId }),
    [token.chainId],
  );

  const sharedListItemProps = {
    testID,
    twClassName: 'bg-muted rounded-lg',
    avatar: (
      <BadgeWrapper
        position={BadgeWrapperPosition.BottomRight}
        badge={
          <BadgeNetwork twClassName="rounded-md" src={networkImageSource} />
        }
      >
        <AvatarToken
          name={token.symbol}
          src={tokenImageSource}
          size={AvatarTokenSize.Lg}
        />
      </BadgeWrapper>
    ),
    title,
    titleProps: { testID: OpenOrderRowSelectorsIDs.TITLE },
    description: subtitle,
    descriptionProps: {
      fontWeight: subtitleFontWeight,
      testID: OpenOrderRowSelectorsIDs.SUBTITLE,
    },
    value: primaryValue,
    valueProps: {
      color: primaryColor,
      testID: OpenOrderRowSelectorsIDs.PRIMARY,
    },
    subvalue: secondaryValue,
    subvalueProps: { testID: OpenOrderRowSelectorsIDs.SECONDARY },
  };

  if (onPress) {
    return (
      <ListItem isInteractive onPress={onPress} {...sharedListItemProps} />
    );
  }

  return <ListItem {...sharedListItemProps} />;
}

export default OpenOrderRow;
