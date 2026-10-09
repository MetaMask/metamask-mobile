import React, { useMemo } from 'react';
import {
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  FontWeight,
  ListItem,
  ListItemProps,
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
  titleColor = TextColor.TextDefault,
  titleEndAccessory,
  primaryColor = TextColor.TextDefault,
  subtitleColor = TextColor.TextAlternative,
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
    titleProps: {
      color: titleColor,
      fontWeight: FontWeight.Medium,
      testID: OpenOrderRowSelectorsIDs.TITLE,
    },
    titleEndAccessory: titleEndAccessory ? (
      <Box testID={OpenOrderRowSelectorsIDs.TITLE_END_ACCESSORY}>
        {titleEndAccessory}
      </Box>
    ) : undefined,
    description: subtitle,
    descriptionProps: {
      color: subtitleColor,
      fontWeight: FontWeight.Medium,
      testID: OpenOrderRowSelectorsIDs.SUBTITLE,
    },
    value: primaryValue,
    valueProps: {
      color: primaryColor,
      testID: OpenOrderRowSelectorsIDs.PRIMARY,
      fontWeight: FontWeight.Medium,
    },
    subvalue: secondaryValue,
    subvalueProps: {
      testID: OpenOrderRowSelectorsIDs.SECONDARY,
      fontWeight: FontWeight.Medium,
    },
  } satisfies ListItemProps;

  if (onPress) {
    return (
      <ListItem isInteractive onPress={onPress} {...sharedListItemProps} />
    );
  }

  return <ListItem {...sharedListItemProps} />;
}

export default OpenOrderRow;
