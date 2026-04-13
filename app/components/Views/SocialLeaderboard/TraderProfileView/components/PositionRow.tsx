import React, { useMemo } from 'react';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  TextColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';
import type { Position } from '@metamask/social-controllers';
import { getAssetImageUrl } from '../../../../UI/Bridge/hooks/useAssetMetadata/utils';
import { chainNameToId } from '../../utils/chainMapping';
import { addThousandsSeparator } from '../../utils/numberFormatting';

export interface PositionRowProps {
  position: Position;
}

function formatUsd(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  const sign = value < 0 ? '-' : '';
  const abs = Math.round(Math.abs(value) * 100) / 100;
  const [whole, frac = ''] = abs.toString().split('.');
  const paddedFrac = frac.padEnd(2, '0').slice(0, 2);
  return `${sign}$${addThousandsSeparator(whole)}${'.'}${paddedFrac}`;
}

function formatTokenAmount(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const [whole, frac = ''] = abs.toString().split('.');
  const commaWhole = addThousandsSeparator(whole);
  return frac ? `${sign}${commaWhole}.${frac}` : `${sign}${commaWhole}`;
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(0)}%`;
}

const PositionRow: React.FC<PositionRowProps> = ({ position }) => {
  const hasPnl = position.pnlPercent != null;
  const isPnlPositive = hasPnl && (position.pnlPercent ?? 0) >= 0;

  const tokenImageUrl = useMemo(() => {
    const chainId = chainNameToId(position.chain);
    if (!chainId) return undefined;
    return getAssetImageUrl(position.tokenAddress, chainId);
  }, [position.chain, position.tokenAddress]);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="px-4 py-3"
      testID={`position-row-${position.tokenSymbol}`}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={4}
        twClassName="flex-1 min-w-0 mr-3"
      >
        <AvatarToken
          name={position.tokenSymbol}
          src={tokenImageUrl ? { uri: tokenImageUrl } : undefined}
          size={AvatarTokenSize.Lg}
        />

        <Box twClassName="flex-1 min-w-0">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={1}
          >
            {position.tokenSymbol}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextMuted}
            numberOfLines={1}
          >
            {`${formatTokenAmount(position.positionAmount)} ${position.tokenSymbol}`}
          </Text>
        </Box>
      </Box>

      <Box alignItems={BoxAlignItems.End}>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {formatUsd(position.currentValueUSD)}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={hasPnl ? undefined : TextColor.TextMuted}
          twClassName={
            hasPnl
              ? isPnlPositive
                ? 'text-success-default'
                : 'text-error-default'
              : undefined
          }
        >
          {formatPercent(position.pnlPercent)}
        </Text>
      </Box>
    </Box>
  );
};

export default PositionRow;
