import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import Engine from '../../../../core/Engine';
import { KalshiDebugPanel, KalshiDebugTestIds } from './KalshiDebugPanel';

/**
 * Unit, not component-view: this sheet is a temporary debug modal, not a
 * registered route, and the behavior under test is the clipboard write, the
 * status read and the restart channel.
 */

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: jest.fn(),
    },
  },
}));

jest.mock('./internal/createKalshiOnboardingClient', () => {
  const getStatus = jest.fn().mockResolvedValue({
    state: 'link_pending',
    intentStatus: 'pending',
    expireTs: 1793972547,
  });
  return {
    createKalshiOnboardingClient: () => ({ getStatus }),
    __getStatus: getStatus,
  };
});

jest.mock('./internal/kalshiRelinkRequest', () => ({
  requestKalshiRelink: jest.fn(),
}));

jest.mock('./internal/kalshiDebugInfo', () => ({
  summarizeA2t: (token: string | undefined) => (token ? { sub: token } : {}),
}));

const messengerCall = Engine.controllerMessenger.call as jest.Mock;
const requestKalshiRelink = jest.requireMock('./internal/kalshiRelinkRequest')
  .requestKalshiRelink as jest.Mock;
const profileId = '2245ae33-2695-4bfe-be45-d01e38de0955';

const renderPanel = () => render(<KalshiDebugPanel />);

describe('KalshiDebugPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the server status after opening', async () => {
    messengerCall.mockResolvedValue(profileId);
    const view = renderPanel();

    fireEvent.press(view.getByTestId(KalshiDebugTestIds.OPEN));
    await view.findByText('link_pending · intent pending · expires 1793972547');
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

  it('restarts onboarding through the relink channel', async () => {
    messengerCall.mockResolvedValue(profileId);
    const view = renderPanel();

    fireEvent.press(view.getByTestId(KalshiDebugTestIds.OPEN));
    fireEvent.press(await view.findByTestId(KalshiDebugTestIds.RESTART));

    await waitFor(() => {
      expect(requestKalshiRelink).toHaveBeenCalledTimes(1);
    });
  });

  it('reports a status failure instead of a state', async () => {
    messengerCall.mockResolvedValue(profileId);
    const getStatus = jest.requireMock(
      './internal/createKalshiOnboardingClient',
    ).__getStatus as jest.Mock;
    getStatus.mockRejectedValueOnce({
      status: 403,
      code: 'venue_authorization_invalid',
    });
    const view = renderPanel();

    fireEvent.press(view.getByTestId(KalshiDebugTestIds.OPEN));

    expect(
      await view.findByText('error: status: 403 venue_authorization_invalid'),
    ).toBeOnTheScreen();
  });

  it('omits the copy button when the profile id is missing', async () => {
    messengerCall.mockResolvedValue(undefined);
    const view = renderPanel();

    fireEvent.press(view.getByTestId(KalshiDebugTestIds.OPEN));
    await waitFor(() => {
      expect(
        view.getByText('link_pending · intent pending · expires 1793972547'),
      ).toBeOnTheScreen();
    });

    expect(
      view.queryByTestId(KalshiDebugTestIds.COPY_PROFILE_ID),
    ).not.toBeOnTheScreen();
  });
});
