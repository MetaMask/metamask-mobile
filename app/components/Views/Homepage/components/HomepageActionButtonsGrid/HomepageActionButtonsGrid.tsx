import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import BuyButton from './buttons/BuyButton';
import SellButton from './buttons/SellButton';
import SwapButton from './buttons/SwapButton';
import SendButton from './buttons/SendButton';
import PerpsButton from './buttons/PerpsButton';
import PredictButton from './buttons/PredictButton';
import BatchSwapButton from './buttons/BatchSwapButton';
import TradersButton from './buttons/TradersButton';
import {
  ACTION_POSITION_BY_INDEX,
  getOrderedButtonRows,
  type HomepageActionButtonId,
} from './constants';
import { HomepageActionButtonsGridTestIds } from './HomepageActionButtonsGrid.testIds';
import type { HomepageActionButtonsGridProps } from './types';

const renderButton = (
  id: HomepageActionButtonId,
  actionPosition: (typeof ACTION_POSITION_BY_INDEX)[number],
  onSend: () => void,
  allowTwoLineLabel: boolean,
) => {
  const slotProps = { actionPosition, allowTwoLineLabel };
  switch (id) {
    case 'buy':
      return <BuyButton {...slotProps} />;
    case 'sell':
      return <SellButton {...slotProps} />;
    case 'swap':
      return <SwapButton {...slotProps} />;
    case 'send':
      return <SendButton {...slotProps} onSend={onSend} />;
    case 'perps':
      return <PerpsButton {...slotProps} />;
    case 'predict':
      return <PredictButton {...slotProps} />;
    case 'batch_swap':
      return <BatchSwapButton {...slotProps} />;
    case 'traders':
      return <TradersButton {...slotProps} />;
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
};

/**
 * Homepage 8-button 2×4 action grid for TMCU-1103 treatments.
 * Row order is controlled by the AB variant (`row1Top` | `row2Top`).
 */
const HomepageActionButtonsGrid = ({
  rowOrder,
  onSend,
  allowTwoLineLabel = false,
}: HomepageActionButtonsGridProps) => {
  const rows = getOrderedButtonRows(rowOrder);

  return (
    <Box
      twClassName="gap-4 px-4 pb-2 pt-1"
      testID={HomepageActionButtonsGridTestIds.CONTAINER}
    >
      {rows.map((rowIds, rowIndex) => (
        <Box
          key={rowIds.join('-')}
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          twClassName="w-full"
        >
          {rowIds.map((id, colIndex) => {
            const actionPosition =
              ACTION_POSITION_BY_INDEX[rowIndex * 4 + colIndex];
            return (
              <React.Fragment key={id}>
                {renderButton(id, actionPosition, onSend, allowTwoLineLabel)}
              </React.Fragment>
            );
          })}
        </Box>
      ))}
    </Box>
  );
};

export default HomepageActionButtonsGrid;
