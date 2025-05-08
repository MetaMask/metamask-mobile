import React from 'react';
import { render } from '@testing-library/react-native';
import PendingDeeplinkHandler from './';
import DeeplinkManager from '../../../core/DeeplinkManager/SharedDeeplinkManager';
import Engine from '../../../core/Engine';
import Routes from '../../../constants/navigation/Routes';

// Mock the dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    dangerouslyGetState: () => ({
      routes: [{ name: 'Home' }],
    }),
  }),
}));

jest.mock('../../../core/DeeplinkManager/SharedDeeplinkManager', () => ({
  getPendingDeeplink: jest.fn(),
  expireDeeplink: jest.fn(),
  parse: jest.fn(),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      isUnlocked: jest.fn(),
    },
  },
}));

describe('PendingDeeplinkHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render an empty View', () => {
    const { toJSON } = render(<PendingDeeplinkHandler />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('process pending deeplink when app is unlocked and not on lock screen', () => {
    const mockPendingDeeplink = 'metamask://test';
    (DeeplinkManager.getPendingDeeplink as jest.Mock).mockReturnValue(
      mockPendingDeeplink,
    );
    (Engine.context.KeyringController.isUnlocked as jest.Mock).mockReturnValue(
      true,
    );

    render(<PendingDeeplinkHandler />);

    expect(DeeplinkManager.getPendingDeeplink).toHaveBeenCalled();
    expect(DeeplinkManager.expireDeeplink).toHaveBeenCalled();
    expect(DeeplinkManager.parse).toHaveBeenCalledWith(mockPendingDeeplink, {
      origin: 'deeplink',
    });
  });

  it('not process deeplink when app is locked', () => {
    const mockPendingDeeplink = 'metamask://test';
    (DeeplinkManager.getPendingDeeplink as jest.Mock).mockReturnValue(
      mockPendingDeeplink,
    );
    (Engine.context.KeyringController.isUnlocked as jest.Mock).mockReturnValue(
      false,
    );

    render(<PendingDeeplinkHandler />);

    expect(DeeplinkManager.getPendingDeeplink).toHaveBeenCalled();
    expect(DeeplinkManager.expireDeeplink).not.toHaveBeenCalled();
    expect(DeeplinkManager.parse).not.toHaveBeenCalled();
  });

  it('not process deeplink when on lock screen', () => {
    const mockPendingDeeplink = 'metamask://test';
    (DeeplinkManager.getPendingDeeplink as jest.Mock).mockReturnValue(
      mockPendingDeeplink,
    );
    (Engine.context.KeyringController.isUnlocked as jest.Mock).mockReturnValue(
      true,
    );

    // Mock navigation state to be on lock screen
    jest
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      .spyOn(require('@react-navigation/native'), 'useNavigation')
      .mockReturnValue({
        dangerouslyGetState: () => ({
          routes: [{ name: Routes.LOCK_SCREEN }],
        }),
      });

    render(<PendingDeeplinkHandler />);

    expect(DeeplinkManager.getPendingDeeplink).toHaveBeenCalled();
    expect(DeeplinkManager.expireDeeplink).not.toHaveBeenCalled();
    expect(DeeplinkManager.parse).not.toHaveBeenCalled();
  });

  it('not process deeplink when there is no pending deeplink', () => {
    (DeeplinkManager.getPendingDeeplink as jest.Mock).mockReturnValue(null);
    (Engine.context.KeyringController.isUnlocked as jest.Mock).mockReturnValue(
      true,
    );

    render(<PendingDeeplinkHandler />);

    expect(DeeplinkManager.getPendingDeeplink).toHaveBeenCalled();
    expect(DeeplinkManager.expireDeeplink).not.toHaveBeenCalled();
    expect(DeeplinkManager.parse).not.toHaveBeenCalled();
  });
});
