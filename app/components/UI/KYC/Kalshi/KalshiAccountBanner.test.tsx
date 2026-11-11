import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import type { KycStep } from '@metamask/kyc-controller';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import renderWithProvider from '../../../../util/test/renderWithProvider';
// eslint-disable-next-line import-x/no-restricted-paths
import { PredictNextRoutes } from '../../PredictNext/navigation/routes';
import {
  KalshiAccountBanner,
  KalshiAccountBannerTestIds,
} from './KalshiAccountBanner';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

jest.mock('../../../../core/Engine', () => ({
  context: { KycFlowController: { refreshStep: jest.fn() } },
}));

const refreshStep = Engine.context.KycFlowController
  .refreshStep as unknown as jest.Mock;

const render = (step?: KycStep) =>
  renderWithProvider(<KalshiAccountBanner />, {
    state: {
      engine: {
        backgroundState: {
          KycFlowController: {
            vendors: step ? { kalshi: { step, sessionId: null } } : {},
          },
        },
      },
    },
  });

describe('KalshiAccountBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    refreshStep.mockResolvedValue('vendor_terms');
  });

  it('asks kyc-api for the step once when it shows', async () => {
    render();

    await waitFor(() =>
      expect(refreshStep).toHaveBeenCalledWith({ vendor: 'kalshi' }),
    );
    expect(refreshStep).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, 'vendor_terms', 'kyc_pending', 'kyc_rejected'] as const)(
    'invites the user to set up Kalshi while the step is %s',
    (step) => {
      const screen = render(step);

      expect(
        screen.getByTestId(KalshiAccountBannerTestIds.BUTTON),
      ).toBeOnTheScreen();
    },
  );

  it('opens Kalshi onboarding', () => {
    const screen = render('vendor_terms');

    fireEvent.press(screen.getByTestId(KalshiAccountBannerTestIds.BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(
      PredictNextRoutes.KALSHI_ONBOARDING,
    );
  });

  it('is hidden once kyc-api has approved the user', () => {
    const screen = render('approved');

    expect(screen.queryByTestId(KalshiAccountBannerTestIds.BUTTON)).toBeNull();
  });

  it('logs, and still shows, when kyc-api cannot be reached', async () => {
    refreshStep.mockRejectedValue(new Error('offline'));
    const screen = render();

    await waitFor(() => expect(Logger.error).toHaveBeenCalled());
    expect(
      screen.getByTestId(KalshiAccountBannerTestIds.BUTTON),
    ).toBeOnTheScreen();
  });
});
