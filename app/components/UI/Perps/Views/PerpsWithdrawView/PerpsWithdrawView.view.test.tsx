/**
 * Component view tests for PerpsWithdrawView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import {
  HYPERLIQUID_ASSET_CONFIGS,
  type AssetRoute,
} from '@metamask/perps-controller';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsWithdrawView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { PerpsWithdrawViewSelectorsIDs } from '../../Perps.testIds';
import { createFundedAccountForViews as fundedAccount } from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';

const arbitrumRoute: AssetRoute = {
  assetId: HYPERLIQUID_ASSET_CONFIGS.usdc.mainnet,
  chainId: 'eip155:42161',
  contractAddress: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7',
  constraints: { minAmount: '1.01', fees: { fixed: 1, token: 'USDC' } },
};

describe('PerpsWithdrawView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(Engine.context.PerpsController.getWithdrawalRoutes)
      .mockReturnValue([arbitrumRoute]);
  });

  it('shows withdrawal quote details and submits a max withdrawal', async () => {
    const withdraw = Engine.context.PerpsController.withdraw as jest.Mock;

    renderPerpsWithdrawView({
      streamOverrides: { account: fundedAccount('250') },
    });

    expect(
      await screen.findByTestId(PerpsWithdrawViewSelectorsIDs.BACK_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsWithdrawViewSelectorsIDs.AVAILABLE_BALANCE_TEXT),
    ).toHaveTextContent(
      strings('perps.withdrawal.available_balance', { amount: '$250' }),
    );
    expect(
      screen.getByTestId(PerpsWithdrawViewSelectorsIDs.FEE_VALUE),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsWithdrawViewSelectorsIDs.TIME_VALUE),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByText('Max'));

    expect(
      await screen.findByTestId(PerpsWithdrawViewSelectorsIDs.CONTINUE_BUTTON),
    ).not.toBeDisabled();
    fireEvent.press(
      screen.getByTestId(PerpsWithdrawViewSelectorsIDs.CONTINUE_BUTTON),
    );

    await waitFor(() => {
      expect(withdraw).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '250.000000',
          assetId: arbitrumRoute.assetId,
        }),
      );
    });
  });

  it('blocks a withdrawal when the selected venue has no supported USDC route', async () => {
    const withdraw = jest.mocked(Engine.context.PerpsController.withdraw);
    jest
      .mocked(Engine.context.PerpsController.getWithdrawalRoutes)
      .mockReturnValue([{ ...arbitrumRoute, providerId: 'hyperliquid' }]);
    renderPerpsWithdrawView({
      overrides: {
        engine: {
          backgroundState: {
            PerpsController: {
              activeProvider: 'aggregated',
              defaultProvider: 'lighter',
              effectiveProvider: 'lighter',
            },
          },
        },
      },
      streamOverrides: {
        account: { ...fundedAccount('250'), providerId: 'lighter' },
      },
    });

    fireEvent.press(await screen.findByText('Max'));

    expect(
      screen.getByText(strings('perps.withdrawal.route_unavailable')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsWithdrawViewSelectorsIDs.CONTINUE_BUTTON),
    ).toBeDisabled();
    expect(withdraw).not.toHaveBeenCalled();
  });

  it('blocks submission and shows the minimum amount error for too-small withdrawals', async () => {
    renderPerpsWithdrawView({
      streamOverrides: { account: fundedAccount('5') },
    });

    await screen.findByTestId(PerpsWithdrawViewSelectorsIDs.BACK_BUTTON);
    fireEvent.press(screen.getByText('10%'));

    expect(
      await screen.findByText(
        strings('perps.withdrawal.minimum_amount_error', { amount: '1.01' }),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsWithdrawViewSelectorsIDs.CONTINUE_BUTTON),
    ).toBeDisabled();
  });

  it('keeps withdrawal unavailable when there is no withdrawable balance', async () => {
    const withdraw = Engine.context.PerpsController.withdraw as jest.Mock;

    renderPerpsWithdrawView({
      streamOverrides: { account: fundedAccount('0') },
    });

    expect(
      await screen.findByTestId(PerpsWithdrawViewSelectorsIDs.BACK_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsWithdrawViewSelectorsIDs.AVAILABLE_BALANCE_TEXT),
    ).toHaveTextContent(
      strings('perps.withdrawal.available_balance', { amount: '$0' }),
    );

    fireEvent.press(screen.getByText('Max'));

    expect(
      screen.queryByTestId(PerpsWithdrawViewSelectorsIDs.CONTINUE_BUTTON),
    ).not.toBeOnTheScreen();
    expect(withdraw).not.toHaveBeenCalled();
  });
});
