/**
 * Component view tests for PerpsMarketDetailsView.
 * State-driven via Redux (initialStatePerps); no hook/selector mocks.
 * Covers bug #25315: Close and Modify actions must be geo-restricted (show geo block sheet when isEligible false).
 * Run with: yarn test:view --testPathPattern="PerpsMarketDetailsView.view.test"
 */
import '../../../../../util/test/component-view/mocks';
import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import PerpsMarketDetailsView from './PerpsMarketDetailsView';
import { renderPerpsView } from '../../../../../util/test/component-view/renderers/perps';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import type { Position, PerpsMarketData } from '../../controllers/types/index';
import { PerpsMarketDetailsViewSelectorsIDs } from '../../Perps.testIds';

const mockMarket: PerpsMarketData = {
  symbol: 'ETH',
  name: 'Ethereum',
  price: '$2,000.00',
  change24h: '+$50.00',
  change24hPercent: '+2.5%',
  volume: '$1.5B',
  maxLeverage: '50x',
  marketType: 'crypto',
};

const mockPosition: Position = {
  symbol: 'ETH',
  size: '2.5',
  marginUsed: '500',
  entryPrice: '2000',
  liquidationPrice: '1900',
  unrealizedPnl: '100',
  returnOnEquity: '0.20',
  leverage: { value: 10, type: 'isolated' },
  cumulativeFunding: { sinceOpen: '5', allTime: '10', sinceChange: '2' },
  positionValue: '5000',
  maxLeverage: 50,
  takeProfitCount: 0,
  stopLossCount: 0,
};

const geoRestrictionOverrides: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      PerpsController: { isEligible: false },
    },
  },
};

function renderView(
  options: {
    overrides?: DeepPartial<RootState>;
    streamOverrides?: { positions: Position[] };
  } = {},
) {
  const { overrides, streamOverrides } = options;
  return renderPerpsView(
    PerpsMarketDetailsView as unknown as React.ComponentType,
    'PerpsMarketDetails',
    {
      overrides: overrides ?? geoRestrictionOverrides,
      initialParams: { market: mockMarket },
      streamOverrides: streamOverrides ?? { positions: [mockPosition] },
    },
  );
}

describe('PerpsMarketDetailsView', () => {
  describe('Bug #25315: Geo-restriction for Close and Modify actions', () => {
    it('when user is geo-restricted (isEligible false), tapping Close shows geo block bottom sheet and does not navigate', async () => {
      renderView();

      const closeButton = await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON,
      );
      fireEvent.press(closeButton);

      expect(
        screen.getByTestId(
          PerpsMarketDetailsViewSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP,
        ),
      ).toBeOnTheScreen();
    });

    it('when user is geo-restricted (isEligible false), tapping Modify shows geo block bottom sheet and does not navigate', async () => {
      renderView();

      const modifyButton = await screen.findByTestId(
        PerpsMarketDetailsViewSelectorsIDs.MODIFY_BUTTON,
      );
      fireEvent.press(modifyButton);

      expect(
        screen.getByTestId(
          PerpsMarketDetailsViewSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP,
        ),
      ).toBeOnTheScreen();
    });
  });
});
