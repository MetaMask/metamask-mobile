import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import type { KycStep, KycStepStatus } from '@metamask/kyc-controller';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { strings } from '../../../../../../../locales/i18n';
import { METAMASK_SUPPORT_URL } from '../../../../../../constants/urls';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { PredictNextRoutes } from '../../../navigation/routes';
import { PredictHomeTestIds } from '../PredictHome.testIds';
import { GetStartedBanner } from './GetStartedBanner';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useEffect } = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({ navigate: mockNavigate }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock('../../../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

jest.mock('../../../../../../core/Engine', () => ({
  context: { VendorOnboardingController: { refreshStep: jest.fn() } },
}));

// The Rive hero needs a navigator and the native runtime.
jest.mock(
  '../../../../Money/components/MoneyVbaHomeCard/MoneyVbaHomeCardHeroAnimation',
  () => () => null,
);

const refreshStep = Engine.context.VendorOnboardingController
  .refreshStep as unknown as jest.Mock;

const render = (step?: KycStep | null, status: KycStepStatus | null = 'none') =>
  renderWithProvider(<GetStartedBanner />, {
    state: {
      engine: {
        backgroundState: {
          VendorOnboardingController: {
            vendors: step ? { kalshi: { step, status } } : {},
          },
        },
      },
    },
  });

const copy = (key: string, field: 'title' | 'description' | 'action') =>
  strings(`predict_next.get_started_banner.${key}.${field}`);

describe('GetStartedBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    refreshStep.mockResolvedValue('terms');
  });

  it('asks kyc-api for the step when it shows', async () => {
    render();

    await waitFor(() =>
      expect(refreshStep).toHaveBeenCalledWith({ vendor: 'kalshi' }),
    );
    expect(refreshStep).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, 'mfa', 'terms'] as const)(
    'invites the user to get started while the step is %s',
    (step) => {
      const screen = render(step);

      expect(screen.getByText(copy('get_started', 'title'))).toBeOnTheScreen();
      expect(screen.getByText(copy('get_started', 'action'))).toBeOnTheScreen();
    },
  );

  it('opens Kalshi onboarding from the get-started card', () => {
    const screen = render('mfa');

    fireEvent.press(screen.getByTestId(PredictHomeTestIds.GET_STARTED_BANNER));

    expect(mockNavigate).toHaveBeenCalledWith(
      PredictNextRoutes.KALSHI_ONBOARDING,
    );
  });

  it('resumes onboarding from the need-more-info card', () => {
    const screen = render('kalshi_phone_link');

    expect(screen.getByText(copy('need_more_info', 'title'))).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(PredictHomeTestIds.GET_STARTED_BANNER));

    expect(mockNavigate).toHaveBeenCalledWith(
      PredictNextRoutes.KALSHI_ONBOARDING,
    );
  });

  it('asks for more info when Kalshi wants another identity check', () => {
    const screen = render('sumsub', 'retry');

    expect(screen.getByText(copy('step_up', 'title'))).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PredictHomeTestIds.GET_STARTED_BANNER_DISMISS),
    ).toBeNull();
  });

  it('shows the review as pending and static', () => {
    const screen = render('decision', 'pending');

    expect(screen.getByText(copy('verifying', 'title'))).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PredictHomeTestIds.GET_STARTED_BANNER_DISMISS),
    ).toBeNull();

    fireEvent.press(screen.getByTestId(PredictHomeTestIds.GET_STARTED_BANNER));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens support from the can-not-verify card', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const screen = render('decision', 'rejected');

    expect(screen.getByText(copy('cant_verify', 'title'))).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(PredictHomeTestIds.GET_STARTED_BANNER));

    expect(openURL).toHaveBeenCalledWith(METAMASK_SUPPORT_URL);
    expect(mockNavigate).not.toHaveBeenCalled();
    openURL.mockRestore();
  });

  it.each([
    [undefined, 'none'],
    ['kalshi_email_link', 'none'],
    ['sumsub', 'retry'],
    ['decision', 'pending'],
  ] as const)(
    'never offers a close button (step %s, status %s)',
    (step, status) => {
      const screen = render(step, status);

      expect(
        screen.getByTestId(PredictHomeTestIds.GET_STARTED_BANNER),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(PredictHomeTestIds.GET_STARTED_BANNER_DISMISS),
      ).toBeNull();
    },
  );

  it('offers a close button on the can-not-verify card and hides it when closed', () => {
    const screen = render('decision', 'rejected');

    fireEvent.press(
      screen.getByTestId(PredictHomeTestIds.GET_STARTED_BANNER_DISMISS),
    );

    expect(
      screen.queryByTestId(PredictHomeTestIds.GET_STARTED_BANNER),
    ).toBeNull();
  });

  it('is hidden once kyc-api has approved the user', () => {
    const screen = render('decision', 'approved');

    expect(
      screen.queryByTestId(PredictHomeTestIds.GET_STARTED_BANNER),
    ).toBeNull();
  });

  it('logs, and still shows, when kyc-api cannot be reached', async () => {
    refreshStep.mockRejectedValue(new Error('offline'));
    const screen = render();

    await waitFor(() => expect(Logger.error).toHaveBeenCalled());
    expect(
      screen.getByTestId(PredictHomeTestIds.GET_STARTED_BANNER),
    ).toBeOnTheScreen();
  });
});
