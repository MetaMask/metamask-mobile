import '../../../../tests/component-view/mocks';
import React from 'react';
import type { GroupedDeFiPositions } from '@metamask/assets-controllers';

import DeFiProtocolPositionDetails, {
  DEFI_PROTOCOL_POSITION_DETAILS_BALANCE_TEST_ID,
} from './DeFiProtocolPositionDetails';
import { WalletViewSelectorsIDs } from '../../Views/Wallet/WalletView.testIds';
import { renderComponentViewScreen } from '../../../../tests/component-view/render';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { backgroundState } from '../../../util/test/initial-root-state';

/**
 * Mirrors smoke `view-defi-details`: tap Aave V3 → read-only position details with
 * Supplied tokens and fiat balances (no transaction).
 */
const aaveV3PositionAggregate: GroupedDeFiPositions['protocols'][number] = {
  protocolDetails: {
    name: 'Aave V3',
    iconUrl: '',
  },
  aggregatedMarketValue: 14.74,
  positionTypes: {
    supply: {
      aggregatedMarketValue: 14.74,
      positions: [
        [
          {
            address: '0x23878914efe38d27c4d67ab83ed1b93a74d4086a',
            name: 'Aave Ethereum USDT',
            symbol: 'aEthUSDT',
            decimals: 6,
            balance: 0.300112,
            balanceRaw: '300112',
            marketValue: 14.74,
            type: 'protocol',
            tokens: [
              {
                address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
                name: 'Tether USD',
                symbol: 'USDT',
                decimals: 6,
                balance: 0.300112,
                balanceRaw: '300112',
                marketValue: 14.74,
                price: 0.99994,
                type: 'underlying',
                iconUrl: '',
              },
            ],
          },
        ],
        [
          {
            address: '0xfa1fdbbd71b0aa16162d76914d69cd8cb3ef92da',
            name: 'Aave Ethereum Lido WETH',
            symbol: 'aEthLidoWETH',
            decimals: 18,
            balance: 1e-5,
            balanceRaw: '9030902767263172',
            marketValue: 0.3,
            type: 'protocol',
            tokens: [
              {
                address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                name: 'Wrapped Ether',
                symbol: 'WETH',
                decimals: 18,
                balance: 1e-5,
                balanceRaw: '10000000000000',
                marketValue: 0.3,
                price: 1599.45,
                type: 'underlying',
                iconUrl: '',
              },
            ],
          },
        ],
      ],
    },
  },
};

const defiDetailsState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        ...backgroundState.PreferencesController,
        privacyMode: false,
      },
    },
  },
};

describeForPlatforms('DeFi position details (read-only)', () => {
  it('shows protocol header, Supplied rows, and token symbols (Aave V3)', () => {
    const { getByTestId, getByText, getAllByText } = renderComponentViewScreen(
      DeFiProtocolPositionDetails,
      { name: 'DeFiProtocolPositionDetails' },
      { state: defiDetailsState },
      {
        protocolAggregate: aaveV3PositionAggregate,
        networkIconAvatar: undefined,
      },
    );

    expect(
      getByTestId(WalletViewSelectorsIDs.DEFI_POSITIONS_DETAILS_CONTAINER),
    ).toBeOnTheScreen();

    expect(getByText('Aave V3')).toBeOnTheScreen();
    expect(
      getByTestId(DEFI_PROTOCOL_POSITION_DETAILS_BALANCE_TEST_ID),
    ).toHaveTextContent('$14.74');

    // One "Supplied" label per supplied position group (same copy as smoke E2E).
    expect(getAllByText('Supplied').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('USDT').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('WETH').length).toBeGreaterThanOrEqual(1);
  });
});
