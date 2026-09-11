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
  createLongPositionForViews,
} from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import { renderPerpsHomeView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  PerpsHomeViewSelectorsIDs,
  PerpsMarketBalanceActionsSelectorsIDs,
} from '../../Perps.testIds';
import { PerpsHomeSectionTestIds } from '../../components/PerpsHomeSection/PerpsHomeSection.testIds';
import { HOME_SCREEN_CONFIG } from '../../constants/perpsConfig';

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

const ineligibleOverrides = {
  engine: {
    backgroundState: {
      PerpsController: {
        isEligible: false,
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

  // ─────────────────────────────────────────────────────────────────────────
  // Geo-block: ineligible user flows
  // ─────────────────────────────────────────────────────────────────────────

  describe('Geo-block: ineligible user flows', () => {
    let originalShowHeaderActionButtons: boolean;

    beforeEach(() => {
      originalShowHeaderActionButtons = HOME_SCREEN_CONFIG.ShowHeaderActionButtons;
      Object.assign(HOME_SCREEN_CONFIG, { ShowHeaderActionButtons: false });
    });

    afterEach(() => {
      Object.assign(HOME_SCREEN_CONFIG, {
        ShowHeaderActionButtons: originalShowHeaderActionButtons,
      });
    });

    it('geo-blocked user sees eligibility tooltip when pressing Add Funds on empty balance', async () => {
      // Arrange
      const depositWithConfirmation = Engine.context.PerpsController
        .depositWithConfirmation as jest.Mock;

      renderPerpsHomeView({
        overrides: ineligibleOverrides,
        streamOverrides: {
          account: createFundedAccountForViews('0'),
          positions: [],
          orders: [],
          marketData: [createEthMarketForViews()],
        },
      });

      // Act – press Add Funds from the balance-actions card (empty-balance entry point)
      fireEvent.press(
        await screen.findByTestId(
          PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON,
          {},
          { timeout: TIMEOUT_MS },
        ),
      );

      // Assert – balance-actions geo-block tooltip appears; deposit never starts
      await waitFor(() => {
        expect(
          screen.getByTestId(
            PerpsMarketBalanceActionsSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP,
          ),
        ).toBeOnTheScreen();
      });
      expect(depositWithConfirmation).not.toHaveBeenCalled();
    });

    it('geo-blocked funded-account user sees home-view eligibility tooltip when pressing footer Add Funds', async () => {
      // Arrange
      const depositWithConfirmation = Engine.context.PerpsController
        .depositWithConfirmation as jest.Mock;

      renderPerpsHomeView({
        overrides: ineligibleOverrides,
        streamOverrides: {
          account: createFundedAccountForViews('100'),
          positions: [],
          orders: [],
          marketData: [createEthMarketForViews()],
        },
      });

      // Act – non-empty balance exposes the fixed footer; press its Add Funds button
      fireEvent.press(
        await screen.findByTestId(
          PerpsHomeViewSelectorsIDs.ADD_FUNDS_BUTTON,
          {},
          { timeout: TIMEOUT_MS },
        ),
      );

      // Assert – home-view eligibility modal appears (separate from the balance-actions one)
      await waitFor(() => {
        expect(
          screen.getByTestId(PerpsHomeViewSelectorsIDs.GEO_BLOCK_TOOLTIP),
        ).toBeOnTheScreen();
      });
      expect(depositWithConfirmation).not.toHaveBeenCalled();
    });

    it('withdraw is NOT geo-blocked for restricted users — withdrawal must never trigger the eligibility tooltip (TAT-2337)', async () => {
      // Arrange – restricted user with funds; withdraw should bypass the geo-block check
      renderPerpsHomeView({
        overrides: ineligibleOverrides,
        streamOverrides: {
          account: createFundedAccountForViews('100'),
          positions: [],
          orders: [],
          marketData: [createEthMarketForViews()],
        },
      });

      // Act – press the footer Withdraw button (visible because balance is non-empty)
      fireEvent.press(
        await screen.findByTestId(
          PerpsHomeViewSelectorsIDs.WITHDRAW_BUTTON,
          {},
          { timeout: TIMEOUT_MS },
        ),
      );

      // Assert – neither geo-block tooltip path may appear; withdrawal proceeds unblocked
      await waitFor(() => {
        expect(
          screen.queryByTestId(PerpsHomeViewSelectorsIDs.GEO_BLOCK_TOOLTIP),
        ).not.toBeOnTheScreen();
        expect(
          screen.queryByTestId(
            PerpsMarketBalanceActionsSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP,
          ),
        ).not.toBeOnTheScreen();
      });
    });

    it('geo-blocked Close All triggers the close-all tooltip and NOT the add-funds eligibility modal', async () => {
      // Arrange – restricted user who has an open position
      renderPerpsHomeView({
        overrides: ineligibleOverrides,
        streamOverrides: {
          account: createFundedAccountForViews('100'),
          positions: [createLongPositionForViews()],
          orders: [],
          marketData: [createEthMarketForViews()],
        },
      });

      // Wait for the position card to confirm the positions section rendered
      await screen.findByTestId(
        `${PerpsHomeViewSelectorsIDs.POSITION_CARD}-0`,
        {},
        { timeout: TIMEOUT_MS },
      );

      // Act – press the positions-section "⋯" action button (Close All entry point)
      fireEvent.press(screen.getByTestId(PerpsHomeSectionTestIds.ACTION_BUTTON));

      // Assert – the close-all geo-block tooltip appears
      await waitFor(() => {
        expect(
          screen.getByTestId(
            PerpsHomeViewSelectorsIDs.CLOSE_ALL_GEO_BLOCK_TOOLTIP,
          ),
        ).toBeOnTheScreen();
      });

      // The add-funds eligibility tooltip must stay hidden — two distinct geo-block paths
      expect(
        screen.queryByTestId(PerpsHomeViewSelectorsIDs.GEO_BLOCK_TOOLTIP),
      ).not.toBeOnTheScreen();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Live stream updates
  // ─────────────────────────────────────────────────────────────────────────

  describe('Live stream updates', () => {
    let originalShowHeaderActionButtons: boolean;

    beforeEach(() => {
      originalShowHeaderActionButtons = HOME_SCREEN_CONFIG.ShowHeaderActionButtons;
      Object.assign(HOME_SCREEN_CONFIG, { ShowHeaderActionButtons: false });
    });

    afterEach(() => {
      Object.assign(HOME_SCREEN_CONFIG, {
        ShowHeaderActionButtons: originalShowHeaderActionButtons,
      });
    });

    it('position section appears when stream delivers first positions to an empty account', async () => {
      // Arrange – start with no positions (section is hidden)
      const { stream } = renderPerpsHomeView({
        overrides: eligibleOverrides,
        streamOverrides: {
          account: createFundedAccountForViews('100'),
          positions: [],
          orders: [],
          marketData: [createEthMarketForViews()],
        },
      });

      // Position card must not be present yet
      expect(
        screen.queryByTestId(`${PerpsHomeViewSelectorsIDs.POSITION_CARD}-0`),
      ).not.toBeOnTheScreen();

      // Act – stream delivers the first position
      act(() => {
        stream.emitPositions([createLongPositionForViews()]);
      });

      // Assert – position card appears
      expect(
        await screen.findByTestId(
          `${PerpsHomeViewSelectorsIDs.POSITION_CARD}-0`,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
    });

    it('positions section PnL subtitle flips sign when account stream delivers negative unrealizedPnl', async () => {
      // Arrange – start with a position and a positive account P&L so the subtitle is visible
      const { stream } = renderPerpsHomeView({
        overrides: eligibleOverrides,
        streamOverrides: {
          account: { ...createFundedAccountForViews('100'), unrealizedPnl: '50' },
          positions: [createLongPositionForViews()],
          orders: [],
          marketData: [createEthMarketForViews()],
        },
      });

      // Wait for the position card, then verify the subtitle is shown with a positive value
      await screen.findByTestId(
        `${PerpsHomeViewSelectorsIDs.POSITION_CARD}-0`,
        {},
        { timeout: TIMEOUT_MS },
      );
      const pnlLabel = screen.getByTestId(
        PerpsHomeViewSelectorsIDs.POSITIONS_PNL_VALUE,
      );
      expect(pnlLabel).toHaveTextContent(/^\+/);

      // Act – account stream delivers an updated unrealizedPnl that is now negative
      act(() => {
        stream.emitAccount({
          ...createFundedAccountForViews('100'),
          unrealizedPnl: '-200',
        });
      });

      // Assert – the subtitle updates to reflect the loss
      await waitFor(
        () => {
          expect(
            screen.getByTestId(PerpsHomeViewSelectorsIDs.POSITIONS_PNL_VALUE),
          ).toHaveTextContent(/^-/);
        },
        { timeout: TIMEOUT_MS },
      );
    });

    it('balance display updates in real time when the account stream delivers a new total balance', async () => {
      // Arrange
      const { stream } = renderPerpsHomeView({
        overrides: eligibleOverrides,
        streamOverrides: {
          account: createFundedAccountForViews('100'),
          positions: [],
          orders: [],
          marketData: [createEthMarketForViews()],
        },
      });

      // Wait for initial balance
      expect(
        await screen.findByTestId(
          PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toHaveTextContent('$100');

      // Act – stream delivers updated account with a different balance
      act(() => {
        stream.emitAccount(createFundedAccountForViews('350'));
      });

      // Assert – balance display reflects the new value
      await waitFor(
        () => {
          expect(
            screen.getByTestId(
              PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE,
            ),
          ).toHaveTextContent('$350');
        },
        { timeout: TIMEOUT_MS },
      );
    });

    it('fixed footer disappears and re-appears as balance crosses zero threshold', async () => {
      // Arrange – start funded so the fixed footer (Withdraw / Add Funds) is visible
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
          PerpsHomeViewSelectorsIDs.FIXED_FOOTER,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();

      // Act – account balance drops to zero (all funds withdrawn)
      act(() => {
        stream.emitAccount(createFundedAccountForViews('0'));
      });

      // Assert – fixed footer is hidden because balance is empty
      await waitFor(
        () => {
          expect(
            screen.queryByTestId(PerpsHomeViewSelectorsIDs.FIXED_FOOTER),
          ).not.toBeOnTheScreen();
        },
        { timeout: TIMEOUT_MS },
      );

      // Act – funds arrive again
      act(() => {
        stream.emitAccount(createFundedAccountForViews('75'));
      });

      // Assert – fixed footer re-appears
      await waitFor(
        () => {
          expect(
            screen.getByTestId(PerpsHomeViewSelectorsIDs.FIXED_FOOTER),
          ).toBeOnTheScreen();
        },
        { timeout: TIMEOUT_MS },
      );
    });
  });
});
