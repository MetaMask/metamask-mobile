import React, { useCallback, useMemo } from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../locales/i18n';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { formatTokenBalance } from '../../utils';
import { BridgeToken } from '../../types';
import { BatchSellReviewSelectorsIDs } from './BatchSellReview.testIds';
import { BatchSellPercentageSlider } from './BatchSellPercentageSlider';

interface BatchSellReviewTokenRowProps {
  token: BridgeToken;
  tokenKey: string;
  percent: number;
  onPercentChange: (tokenKey: string, percent: number) => void;
  onSlippagePress?: (token: BridgeToken) => void;
  onRemovePress?: (token: BridgeToken) => void;
}

function getTokenBalanceText(token: BridgeToken, percent: number) {
  const balanceText = token.balance
    ? `${formatTokenBalance(token.balance)} ${token.symbol}`
    : token.symbol;

  return `${balanceText} • ${percent}%`;
}

export function BatchSellReviewTokenRow({
  token,
  tokenKey,
  percent,
  onPercentChange,
  onSlippagePress,
  onRemovePress,
}: BatchSellReviewTokenRowProps) {
  const tw = useTailwind();
  const balanceText = useMemo(
    () => getTokenBalanceText(token, percent),
    [percent, token],
  );

  const handlePercentChange = useCallback(
    (nextPercent: number) => {
      onPercentChange(tokenKey, nextPercent);
    },
    [onPercentChange, tokenKey],
  );

  return (
    <Box
      testID={`${BatchSellReviewSelectorsIDs.TOKEN_ROW}-${tokenKey}`}
      twClassName="gap-2 px-4 py-2"
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={4}
      >
        <AvatarToken
          name={token.symbol}
          src={token.image ? { uri: token.image } : undefined}
          size={AvatarTokenSize.Lg}
        />
        <Box twClassName="min-w-0 flex-1 gap-0.5">
          <Skeleton
            width={114}
            height={24}
            style={tw.style('rounded-lg')}
            testID={`${BatchSellReviewSelectorsIDs.TOKEN_AMOUNT_SKELETON}-${tokenKey}`}
          />
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {balanceText}
          </Text>
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={4}
        >
          <ButtonIcon
            iconName={IconName.Customize}
            iconProps={{ color: IconColor.IconAlternative }}
            size={ButtonIconSize.Md}
            accessibilityLabel={strings('bridge.batch_sell_customize_token', {
              tokenSymbol: token.symbol,
            })}
            onPress={() => onSlippagePress?.(token)}
            testID={`${BatchSellReviewSelectorsIDs.CUSTOMIZE_BUTTON}-${tokenKey}`}
          />
          <ButtonIcon
            iconName={IconName.RemoveMinus}
            iconProps={{ color: IconColor.IconAlternative }}
            size={ButtonIconSize.Md}
            accessibilityLabel={strings('bridge.batch_sell_remove_token', {
              tokenSymbol: token.symbol,
            })}
            onPress={() => onRemovePress?.(token)}
            testID={`${BatchSellReviewSelectorsIDs.REMOVE_BUTTON}-${tokenKey}`}
          />
        </Box>
      </Box>
      <BatchSellPercentageSlider
        value={percent}
        onValueChange={handlePercentChange}
        testID={`${BatchSellReviewSelectorsIDs.TOKEN_SLIDER}-${tokenKey}`}
      />
    </Box>
  );
}
