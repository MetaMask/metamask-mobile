import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import {
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { getNetworkImageSource } from '../../../../../util/networks';
import { MUSD_TOKEN } from '../../../Earn/constants/musd';
import { MoneyMusdEmptyBalanceRowTestIds } from './MoneyMusdEmptyBalanceRow.testIds';

const styles = StyleSheet.create({
  badgeWrapper: { alignSelf: 'center' },
});

interface MoneyMusdEmptyBalanceRowProps {
  onPress?: () => void;
}

const MoneyMusdEmptyBalanceRow = ({
  onPress,
}: MoneyMusdEmptyBalanceRowProps) => (
  <Pressable
    onPress={onPress}
    testID={MoneyMusdEmptyBalanceRowTestIds.CONTAINER}
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="px-4 py-3 gap-4"
    >
      <BadgeWrapper
        position={BadgeWrapperPosition.BottomRight}
        style={styles.badgeWrapper}
        badge={
          <BadgeNetwork
            name={MUSD_TOKEN.symbol}
            src={
              getNetworkImageSource({
                chainId: CHAIN_IDS.MAINNET,
              }) as React.ComponentProps<typeof BadgeNetwork>['src']
            }
          />
        }
      >
        <AvatarToken
          name={MUSD_TOKEN.symbol}
          src={
            MUSD_TOKEN.imageSource as React.ComponentProps<
              typeof AvatarToken
            >['src']
          }
          size={AvatarTokenSize.Lg}
        />
      </BadgeWrapper>
      <Box twClassName="flex-1">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {MUSD_TOKEN.name}
        </Text>
      </Box>
      <Box twClassName="items-end">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          testID={MoneyMusdEmptyBalanceRowTestIds.FIAT_BALANCE}
        >
          $0.00
        </Text>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          testID={MoneyMusdEmptyBalanceRowTestIds.NATIVE_BALANCE}
        >
          {`0 ${MUSD_TOKEN.symbol}`}
        </Text>
      </Box>
    </Box>
  </Pressable>
);

export default MoneyMusdEmptyBalanceRow;
