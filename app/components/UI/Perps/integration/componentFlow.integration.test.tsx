/**
 * Integration tests — perps rendered-component flows, Shape C.
 *
 * These render real perps UI and drive it with user presses. The component
 * hooks reach the Shape B Engine shim, which delegates into the real
 * TradingService and real HyperLiquidProvider while the SDK/native I/O
 * boundary stays mocked by the harness.
 */

import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { buildPerpsComponentHarness } from '../../../../../tests/integration/harnesses/perps-component';
import { PerpsFlipPositionConfirmSheetSelectorsIDs , PerpsOrderViewSelectorsIDs } from '../Perps.testIds';
import PerpsFlipPositionConfirmSheet from '../components/PerpsFlipPositionConfirmSheet';
import PerpsOrderView from '../Views/PerpsOrderView/PerpsOrderView';

describe('Perps component flows — integration', () => {
  describe('placing an order from a rendered order screen', () => {
    it('submits a long market order through the rendered PerpsOrderView', async () => {
      // Arrange
      const perps = buildPerpsComponentHarness();
      try {
        perps.harness.setupTradingReady();
        perps.renderScreenWithFlow(PerpsOrderView, {
          routeName: 'PerpsOrder',
          initialParams: {
            asset: 'BTC',
            direction: 'long',
            amount: '100',
            leverage: 3,
            defaultSzDecimals: 3,
            defaultMaxLeverage: 50,
          },
        });

        // Act
        const placeOrderButton = await screen.findByTestId(
          PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON,
        );
        await waitFor(() => {
          expect(
            placeOrderButton.props.disabled ??
              placeOrderButton.props.accessibilityState?.disabled,
          ).not.toBe(true);
        });

        fireEvent.press(placeOrderButton);

        // Assert
        await waitFor(() => {
          expect(perps.mocks.exchangeClient.order).toHaveBeenCalledTimes(1);
        });
        expect(perps.mocks.exchangeClient.order).toHaveBeenCalledWith(
          expect.objectContaining({
            orders: [
              expect.objectContaining({
                a: 0,
                b: true,
                t: { limit: { tif: 'FrontendMarket' } },
              }),
            ],
          }),
        );
        expect(perps.mocks.showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            labelOptions: expect.arrayContaining([
              expect.objectContaining({
                label: expect.stringMatching(/submitted/i),
              }),
            ]),
          }),
        );
        await waitFor(() => {
          expect(perps.mocks.showToast.mock.calls.length).toBeGreaterThan(1);
        });
      } finally {
        perps.teardown();
      }
    });
  });

  describe('reversing a position from a rendered confirmation sheet', () => {
    it('surfaces ORDER_PRICE_REQUIRED from a rendered flip button press', async () => {
      // Arrange
      const perps = buildPerpsComponentHarness();
      try {
        perps.harness.setupTradingReady();
        const openLongBTC = {
          coin: 'BTC',
          symbol: 'BTC',
          size: '0.1',
          entryPrice: '50000',
          positionValue: '5000',
          unrealizedPnl: '0',
          marginUsed: '500',
          leverage: { type: 'cross' as const, value: 10 },
          liquidationPrice: '45000',
          maxLeverage: 50,
          returnOnEquity: '0',
          cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
        };
        perps.renderWithFlow(
          <PerpsFlipPositionConfirmSheet position={openLongBTC} />,
        );

        // Act
        fireEvent.press(
          await screen.findByTestId(
            PerpsFlipPositionConfirmSheetSelectorsIDs.FLIP_BUTTON,
          ),
        );

        // Assert
        await waitFor(() => {
          expect(perps.mocks.showToast).toHaveBeenCalledWith(
            expect.objectContaining({
              labelOptions: expect.arrayContaining([
                expect.objectContaining({
                  label: 'Order failed',
                }),
              ]),
            }),
          );
        });
        expect(perps.mocks.exchangeClient.order).not.toHaveBeenCalled();
        expect(
          screen.getByTestId(PerpsFlipPositionConfirmSheetSelectorsIDs.SHEET),
        ).toBeOnTheScreen();
      } finally {
        perps.teardown();
      }
    });
  });
});
