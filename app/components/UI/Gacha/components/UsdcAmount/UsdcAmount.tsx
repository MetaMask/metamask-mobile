import React from 'react';
import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { SOLANA_USDC_ICON_URL } from '../../providers/collector-crypt/constants';

const USDC_ICON_SOURCE = { uri: SOLANA_USDC_ICON_URL };

/** Small Solana USDC token icon. */
export const UsdcIcon = ({
  size = AvatarTokenSize.Xs,
}: {
  size?: AvatarTokenSize;
}) => (
  <AvatarToken
    name={strings('gacha.usdc')}
    src={USDC_ICON_SOURCE}
    size={size}
  />
);

export interface UsdcAmountProps {
  /** Display amount without unit, e.g. "12.50". */
  amount: string;
  variant?: TextVariant;
  color?: TextColor;
  fontWeight?: FontWeight;
  testID?: string;
}

/** "[USDC icon] 12.50 USDC". */
const UsdcAmount = ({
  amount,
  variant = TextVariant.BodyMd,
  color = TextColor.TextDefault,
  fontWeight = FontWeight.Medium,
  testID,
}: UsdcAmountProps) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    gap={2}
    twClassName="shrink"
    accessible={false}
  >
    <UsdcIcon />
    <Text
      variant={variant}
      color={color}
      fontWeight={fontWeight}
      numberOfLines={1}
      twClassName="shrink"
      testID={testID}
    >
      {strings('gacha.usdc_amount', { amount })}
    </Text>
  </Box>
);

export default UsdcAmount;
