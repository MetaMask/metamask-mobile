import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { getNetworkImageSource } from '../../../../../util/networks';
import { MUSD_TOKEN } from '../../../Earn/constants/musd';
import { MoneyMusdEmptyBalanceRowTestIds } from './MoneyMusdEmptyBalanceRow.testIds';
import type { ImageOrSvgSrc } from '@metamask/design-system-react-native/dist/components/temp-components/ImageOrSvg/ImageOrSvg.types.d.cts';

const styles = StyleSheet.create({
  badgeWrapper: { alignSelf: 'center' },
});

interface MoneyMusdEmptyBalanceRowProps {
  /**
   * Handler fired when the row is tapped. Navigates to the mUSD asset detail
   * page.
   */
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
        badgePosition={BadgePosition.BottomRight}
        style={styles.badgeWrapper}
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            imageSource={getNetworkImageSource({
              chainId: CHAIN_IDS.MAINNET,
            })}
          />
        }
      >
        <AvatarToken
          name={MUSD_TOKEN.symbol}
          src={MUSD_TOKEN.imageSource as ImageOrSvgSrc}
          size={AvatarTokenSize.Md}
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
