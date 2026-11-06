import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import Engine from '../../../../core/Engine';
import { KalshiDebugPanel, KalshiDebugTestIds } from './KalshiDebugPanel';

/**
 * Unit, not component-view: this sheet is a temporary debug modal, not a
 * registered route, and the behavior under test is the clipboard write.
 */

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: jest.fn(),
    },
    context: {
      PredictPortfolioService: {
        invalidateQueries: jest.fn().mockResolvedValue(undefined),
      },
    },
  },
}));

jest.mock('./internal/createKalshiOnboardingClient', () => ({
  createKalshiOnboardingClient: () => ({
    getStatus: jest.fn().mockResolvedValue({ state: 'active' }),
  }),
}));

jest.mock('./internal/kalshiDebugInfo', () => ({
  readKalshiDemoEmail: jest.fn().mockResolvedValue(undefined),
  summarizeA2t: (token: string | undefined) => (token ? { sub: token } : {}),
}));

const messengerCall = Engine.controllerMessenger.call as jest.Mock;
const invalidateQueries = Engine.context.PredictPortfolioService
  .invalidateQueries as jest.Mock;
const profileId = '2245ae33-2695-4bfe-be45-d01e38de0955';

const renderPanel = () =>
  render(<KalshiDebugPanel balance={undefined} balanceError={null} />);

describe('KalshiDebugPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('copies the profile id', async () => {
    messengerCall.mockResolvedValue(profileId);
    const view = renderPanel();

    fireEvent.press(view.getByTestId(KalshiDebugTestIds.OPEN));
    fireEvent.press(
      await view.findByTestId(KalshiDebugTestIds.COPY_PROFILE_ID),
    );

    expect(Clipboard.setString).toHaveBeenCalledTimes(1);
    expect(Clipboard.setString).toHaveBeenCalledWith(profileId);
  });

  it('refreshes the cached balance the app is showing', async () => {
    messengerCall.mockResolvedValue(profileId);
    const view = renderPanel();

    fireEvent.press(view.getByTestId(KalshiDebugTestIds.OPEN));
    await view.findByText('active');
    fireEvent.press(view.getByText('Refresh'));

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledTimes(2);
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['PredictPortfolioService:getBalance', 'kalshi'],
    });
  });

  it('omits the copy button when the profile id is missing', async () => {
    messengerCall.mockResolvedValue(undefined);
    const view = renderPanel();

    fireEvent.press(view.getByTestId(KalshiDebugTestIds.OPEN));
    await waitFor(() => {
      expect(view.getByText('active')).toBeOnTheScreen();
    });

    expect(
      view.queryByTestId(KalshiDebugTestIds.COPY_PROFILE_ID),
    ).not.toBeOnTheScreen();
  });
});
