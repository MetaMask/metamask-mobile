import React from 'react';
import { type StyleProp, type ViewStyle, View } from 'react-native';
import {
  ButtonBase,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { WalletViewSelectorsIDs } from '../../WalletView.testIds';

export interface WalletHeaderAccountPickerRowProps {
  displayName: string;
  onPress: () => void;
  hitSlop?: { top: number; bottom: number; left: number; right: number };
  style?: StyleProp<ViewStyle>;
}

/**
 * The named account picker shown beneath the wallet header. Social V1 collapses
 * the header's picker to the profile avatar, so switching accounts moves here.
 */
const WalletHeaderAccountPickerRow = ({
  displayName,
  onPress,
  hitSlop,
  style,
}: WalletHeaderAccountPickerRowProps) => (
  <View style={style} testID={WalletViewSelectorsIDs.WALLET_ACCOUNT_PICKER_ROW}>
    <ButtonBase
      onPress={onPress}
      testID={WalletViewSelectorsIDs.WALLET_ACCOUNT_PICKER_ROW_PICKER}
      accessibilityRole="button"
      accessibilityLabel={displayName}
      hitSlop={hitSlop}
      isFullWidth={false}
      twClassName="flex-row items-center gap-2 self-start bg-transparent px-4 pb-2 pt-1"
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        numberOfLines={1}
        testID={WalletViewSelectorsIDs.WALLET_ACCOUNT_PICKER_ROW_NAME}
      >
        {displayName}
      </Text>
      <Icon
        name={IconName.ArrowDown}
        size={IconSize.Sm}
        color={IconColor.IconDefault}
      />
    </ButtonBase>
  </View>
);

export default WalletHeaderAccountPickerRow;
