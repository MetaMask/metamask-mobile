import React, { useMemo } from 'react';
import { Image, TouchableOpacity } from 'react-native';
import {
  AvatarToken,
  AvatarTokenSize,
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  KeyValueRow,
  KeyValueRowVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { getTokenImageSource } from '../../../utils';
import { NetworkFeeRowSelectorsIDs } from './testIds';
import type { NetworkFeeRowProps } from './types';

const NETWORK_FEE_BADGE_SIZE = 8;

const NetworkFeeRow: React.FC<NetworkFeeRowProps> = ({
  amount,
  token,
  onPress,
  testID = NetworkFeeRowSelectorsIDs.CONTAINER,
}) => {
  const tw = useTailwind();

  const tokenImageSource = useMemo(
    () =>
      token
        ? getTokenImageSource(
            token.symbol,
            token.image,
            token.address,
            token.chainId,
          )
        : undefined,
    [token],
  );

  const networkImageSource = useMemo(
    () =>
      token ? getNetworkImageSource({ chainId: token.chainId }) : undefined,
    [token],
  );

  const feeTokenAvatar = token ? (
    <BadgeWrapper
      testID={NetworkFeeRowSelectorsIDs.AVATAR}
      position={BadgeWrapperPosition.BottomRight}
      twClassName="mt-1"
      badge={
        <Box
          twClassName="overflow-hidden border-2 border-background-default bg-default rounded-[2px]"
          style={{
            width: NETWORK_FEE_BADGE_SIZE,
            height: NETWORK_FEE_BADGE_SIZE,
          }}
        >
          {networkImageSource ? (
            <Image
              source={networkImageSource}
              style={tw.style('h-full w-full')}
            />
          ) : null}
        </Box>
      }
    >
      <AvatarToken
        name={token.symbol}
        src={tokenImageSource}
        size={AvatarTokenSize.Xs}
      />
    </BadgeWrapper>
  ) : undefined;

  const value = onPress ? (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={strings('bridge.limit.est_network_fee')}
      onPress={onPress}
      activeOpacity={0.6}
      testID={testID}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
      >
        {feeTokenAvatar}
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={NetworkFeeRowSelectorsIDs.VALUE}
          fontWeight={FontWeight.Regular}
        >
          {amount}
        </Text>
      </Box>
    </TouchableOpacity>
  ) : (
    amount
  );

  return (
    <KeyValueRow
      variant={KeyValueRowVariant.Summary}
      keyLabel={strings('bridge.limit.est_network_fee')}
      keyTextProps={{
        variant: TextVariant.BodyMd,
        color: TextColor.TextAlternative,
        fontWeight: FontWeight.Regular,
      }}
      valueStartAccessory={onPress ? undefined : feeTokenAvatar}
      value={value}
      valueTextProps={
        onPress
          ? undefined
          : {
              variant: TextVariant.BodyMd,
              color: TextColor.TextAlternative,
              testID: NetworkFeeRowSelectorsIDs.VALUE,
              fontWeight: FontWeight.Regular,
            }
      }
      twClassName="h-8"
      testID={onPress ? undefined : testID}
    />
  );
};

export default NetworkFeeRow;
