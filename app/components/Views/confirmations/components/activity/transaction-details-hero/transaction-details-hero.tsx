import React from 'react';
import { Box } from '../../../../../UI/Box/Box';
import { TokenIcon, TokenIconVariant } from '../../token-icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { AlignItems } from '../../../../../UI/Box/box.types';

export function TransactionDetailsHero() {
  const chainId = '0x1';
  const USDC = '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

  return (
    <Box alignItems={AlignItems.center} gap={8}>
      <Box>
        <TokenIcon
          chainId={chainId}
          address={USDC}
          variant={TokenIconVariant.Hero}
          showNetwork={false}
        />
      </Box>
      <Text variant={TextVariant.HeadingLG}>$500</Text>
      <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
        0.250 USDC
      </Text>
    </Box>
  );
}
