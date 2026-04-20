import React, { useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
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
import {
  formatUsd,
  formatTokenAmount,
  formatPercent,
  formatTradeDate,
} from '../../utils/formatters';

export interface PositionRowProps {
  position: Position;
  onPress?: (position: Position) => void;
}

const PositionRow: React.FC<PositionRowProps> = ({ position, onPress }) => {
  const isClosed = position.positionAmount === 0 && position.soldUsd > 0;

  const displayValue = isClosed
    ? position.soldUsd
    : (position.currentValueUSD ?? null);

  const closedPnlPercent =
    isClosed && position.boughtUsd > 0
      ? (position.realizedPnl / position.boughtUsd) * 100
      : null;

  const displayPnlPercent = isClosed ? closedPnlPercent : position.pnlPercent;
  const hasPnl = displayPnlPercent != null;
  const isPnlPositive = hasPnl && (displayPnlPercent ?? 0) >= 0;
  const testID = `position-row-${position.tokenSymbol}`;

  const tokenImageUrl = useMemo(() => {
    const chainId = chainNameToId(position.chain);
    if (!chainId) return undefined;
    return getAssetImageUrl(position.tokenAddress, chainId);
  }, [position.chain, position.tokenAddress]);

  const content = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="px-4 py-3"
      testID={onPress ? undefined : testID}
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
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {isClosed
              ? formatTradeDate(position.lastTradeAt)
              : `${formatTokenAmount(position.positionAmount)} ${position.tokenSymbol}`}
          </Text>
        </Box>
      </Box>

      <Box alignItems={BoxAlignItems.End}>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {formatUsd(displayValue)}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={hasPnl ? undefined : TextColor.TextAlternative}
          twClassName={
            hasPnl
              ? isPnlPositive
                ? 'text-success-default'
                : 'text-error-default'
              : undefined
          }
        >
          {formatPercent(displayPnlPercent)}
        </Text>
      </Box>
    </Box>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={() => onPress(position)} testID={testID}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

export default PositionRow;
