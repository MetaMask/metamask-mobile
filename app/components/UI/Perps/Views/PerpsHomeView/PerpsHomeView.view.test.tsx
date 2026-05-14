/**
 * Component view tests for PerpsHomeView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { AccountState, PerpsMarketData } from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';
import { renderPerpsHomeView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { PerpsMarketBalanceActionsSelectorsIDs } from '../../Perps.testIds';

const TIMEOUT_MS = 5000;

const eligibleOverrides = {
  engine: {
    backgroundState: {
      PerpsController: {
        isEligible: true,
        isFirstTimeUser: { mainnet: false, testnet: false },
      },
    },
  },
};

const fundedAccount = (balance: string): AccountState => ({
  spendableBalance: balance,
  withdrawableBalance: balance,
  totalBalance: balance,
  marginUsed: '0',
  unrealizedPnl: '0',
  returnOnEquity: '0',
});

const ethMarket: PerpsMarketData = {
  symbol: 'ETH',
  name: 'Ethereum',
  maxLeverage: '50x',
  price: '$2,500.00',
  change24h: '+$50.00',
  change24hPercent: '+2.0%',
  volume: '$1.5B',
  marketType: 'crypto',
};

describe('PerpsHomeView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deposits from Add funds and reflects the updated Perps balance from the account stream', async () => {
    const depositWithConfirmation = Engine.context.PerpsController
      .depositWithConfirmation as jest.Mock;

    const { stream } = renderPerpsHomeView({
      overrides: eligibleOverrides,
      streamOverrides: {
        account: fundedAccount('100'),
        positions: [],
        orders: [],
        marketData: [ethMarket],
      },
    });

    expect(
      await screen.findByTestId(
        PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE,
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toHaveTextContent('$100');

    fireEvent.press(
      screen.getByTestId(
        PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON,
      ),
    );

    await waitFor(() => {
      expect(depositWithConfirmation).toHaveBeenCalledWith({
        amount: undefined,
        placeOrder: false,
      });
    });

    act(() => {
      stream.emitAccount(fundedAccount('180'));
    });

    await waitFor(() => {
      expect(
        screen.getByTestId(PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE),
      ).toHaveTextContent('$180');
    });
  });
});
