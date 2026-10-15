import React from 'react';
import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonSemantic,
  ButtonSemanticSeverity,
  ButtonSize,
  ButtonVariant,
  IconName,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type { PerpDirection } from '../../../../UI/SocialFeed/utils/perp';
import type { QuickBuyTradeMode } from '../../../../UI/QuickBuy/types';
import { PositionDetailsSheetSelectorsIDs } from '../PositionDetailsSheet.testIds';

export interface PositionSheetFooterProps {
  isPerp: boolean;
  isClosed: boolean;
  /** Spot only: the viewer holds the token, so Sell is offered. */
  canSell: boolean;
  onCopyTrade: () => void;
  onPerpsOrder: (direction: PerpDirection) => void;
  onSpotTrade: (mode: QuickBuyTradeMode) => void;
}

/**
 * Open positions offer Copy trade. Closed ones offer a fresh trade in the
 * same market: Long / Short for perps, Sell / Buy for spot (Sell only when the
 * viewer has something to sell).
 */
const PositionSheetFooter = ({
  isPerp,
  isClosed,
  canSell,
  onCopyTrade,
  onPerpsOrder,
  onSpotTrade,
}: PositionSheetFooterProps) => {
  const tw = useTailwind();
  const halfWidth = tw.style('flex-1');

  const renderActions = () => {
    if (!isClosed) {
      return (
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          startIconName={IconName.SwapHorizontal}
          onPress={onCopyTrade}
          testID={PositionDetailsSheetSelectorsIDs.COPY_TRADE_BUTTON}
        >
          {strings('social_leaderboard.feed.position_card.copy_trade')}
        </Button>
      );
    }

    if (isPerp) {
      return (
        <>
          <ButtonSemantic
            severity={ButtonSemanticSeverity.Success}
            size={ButtonSize.Lg}
            onPress={() => onPerpsOrder('long')}
            style={halfWidth}
            testID={PositionDetailsSheetSelectorsIDs.LONG_BUTTON}
          >
            {strings('social_leaderboard.trader_position.long')}
          </ButtonSemantic>
          <ButtonSemantic
            severity={ButtonSemanticSeverity.Danger}
            size={ButtonSize.Lg}
            onPress={() => onPerpsOrder('short')}
            style={halfWidth}
            testID={PositionDetailsSheetSelectorsIDs.SHORT_BUTTON}
          >
            {strings('social_leaderboard.trader_position.short')}
          </ButtonSemantic>
        </>
      );
    }

    return (
      <>
        {canSell ? (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={() => onSpotTrade('sell')}
            style={halfWidth}
            testID={PositionDetailsSheetSelectorsIDs.SELL_BUTTON}
          >
            {strings('social_leaderboard.trader_position.sell')}
          </Button>
        ) : null}
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={() => onSpotTrade('buy')}
          style={halfWidth}
          testID={PositionDetailsSheetSelectorsIDs.BUY_BUTTON}
        >
          {strings('social_leaderboard.trader_position.buy')}
        </Button>
      </>
    );
  };

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      gap={3}
      twClassName="px-4 pt-2 pb-5"
    >
      {renderActions()}
    </Box>
  );
};

export default PositionSheetFooter;
