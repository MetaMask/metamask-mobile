/**
 * Component view tests for PerpsHomeView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import {
  createEthMarketForViews,
  createFundedAccountForViews,
} from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
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

describe('PerpsHomeView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Add funds as the next action for a no-funds trader', async () => {
    const depositWithConfirmation = Engine.context.PerpsController
      .depositWithConfirmation as jest.Mock;

    renderPerpsHomeView({
      overrides: eligibleOverrides,
      streamOverrides: {
        account: createFundedAccountForViews('0'),
        positions: [],
        orders: [],
        marketData: [createEthMarketForViews()],
      },
    });

    const addFundsButton = await screen.findByTestId(
      PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON,
      {},
      { timeout: TIMEOUT_MS },
    );

    expect(
      screen.getByTestId(PerpsMarketBalanceActionsSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(addFundsButton).toBeOnTheScreen();

    fireEvent.press(addFundsButton);

    await waitFor(() => {
      expect(depositWithConfirmation).toHaveBeenCalledWith({
        amount: undefined,
        placeOrder: false,
      });
    });
  });

  it('deposits from Add funds and reflects the updated Perps balance from the account stream', async () => {
    const depositWithConfirmation = Engine.context.PerpsController
      .depositWithConfirmation as jest.Mock;

    const { stream } = renderPerpsHomeView({
      overrides: eligibleOverrides,
      streamOverrides: {
        account: createFundedAccountForViews('100'),
        positions: [],
        orders: [],
        marketData: [createEthMarketForViews()],
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
      stream.emitAccount(createFundedAccountForViews('180'));
    });

    await waitFor(() => {
      expect(
        screen.getByTestId(PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE),
      ).toHaveTextContent('$180');
    });
  });
});
