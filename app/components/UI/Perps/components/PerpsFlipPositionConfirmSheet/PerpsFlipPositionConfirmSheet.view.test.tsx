import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { Position, PriceUpdate } from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import {
  defaultPositionForViews,
  renderPerpsView,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { PerpsFlipPositionConfirmSheetSelectorsIDs } from '../../Perps.testIds';
import PerpsFlipPositionConfirmSheet from './PerpsFlipPositionConfirmSheet';

const ETH_PRICE = '2700';

const ethPrices: Record<string, PriceUpdate> = {
  ETH: {
    symbol: 'ETH',
    price: ETH_PRICE,
    markPrice: ETH_PRICE,
    percentChange24h: '0',
    timestamp: 1,
    isTradable: true,
  },
};

const renderFlipSheet = (size: string) => {
  const position: Position = { ...defaultPositionForViews, size };
  const FlipSheet: React.FC = () => (
    <PerpsFlipPositionConfirmSheet
      position={position}
      onClose={jest.fn()}
      onConfirm={jest.fn()}
    />
  );
  return renderPerpsView(FlipSheet, 'FlipSheetTest', {
    streamOverrides: { positions: [position], prices: ethPrices },
  });
};

describe('PerpsFlipPositionConfirmSheet', () => {
  beforeEach(() => {
    jest.mocked(Engine.context.PerpsController.flipPosition).mockClear();
  });

  it('disables Reverse and names the minimum when the reverse order is under $10 plus slippage', async () => {
    // 2 x 0.0019 ETH x $2,700 = $10.26: above $10 at mid, below the 3% slippage margin
    renderFlipSheet('-0.0019');

    expect(
      await screen.findByText(
        strings('perps.flip_position.below_minimum', { amount: '10' }),
      ),
    ).toBeOnTheScreen();
    // Guards against a missing locale key rendering the same placeholder here and in the sheet
    expect(
      screen.getByTestId(
        PerpsFlipPositionConfirmSheetSelectorsIDs.MINIMUM_ERROR,
      ),
    ).toHaveTextContent(/\$10\b/);
    const reverseButton = screen.getByTestId(
      PerpsFlipPositionConfirmSheetSelectorsIDs.FLIP_BUTTON,
    );
    expect(reverseButton).toBeDisabled();

    fireEvent.press(reverseButton);

    expect(Engine.context.PerpsController.flipPosition).not.toHaveBeenCalled();
  });

  it('blocks reversing a position worth about $4', async () => {
    renderFlipSheet('-0.0016');

    expect(
      await screen.findByTestId(
        PerpsFlipPositionConfirmSheetSelectorsIDs.MINIMUM_ERROR,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsFlipPositionConfirmSheetSelectorsIDs.FLIP_BUTTON),
    ).toBeDisabled();
  });

  it('keeps Reverse available when the reverse order clears the minimum', async () => {
    // 2 x 0.002 ETH x $2,700 = $10.80
    renderFlipSheet('-0.002');

    await waitFor(() =>
      expect(
        screen.getByTestId(
          PerpsFlipPositionConfirmSheetSelectorsIDs.FLIP_BUTTON,
        ),
      ).toBeEnabled(),
    );
    expect(
      screen.queryByTestId(
        PerpsFlipPositionConfirmSheetSelectorsIDs.MINIMUM_ERROR,
      ),
    ).not.toBeOnTheScreen();

    await act(async () => {
      await fireEvent.press(
        screen.getByTestId(
          PerpsFlipPositionConfirmSheetSelectorsIDs.FLIP_BUTTON,
        ),
      );
    });

    expect(Engine.context.PerpsController.flipPosition).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'ETH' }),
    );
  });
});
