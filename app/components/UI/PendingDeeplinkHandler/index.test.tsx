import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import PendingDeeplinkHandler from './';
import DeeplinkManager from '../../../core/DeeplinkManager/SharedDeeplinkManager';
import Routes from '../../../constants/navigation/Routes';
import { backgroundState } from '../../../util/test/initial-root-state';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      dangerouslyGetState: () => ({
        routes: [{ name: 'Home' }],
      }),
    }),
  };
});

jest.mock('../../../core/DeeplinkManager/SharedDeeplinkManager', () => ({
  getPendingDeeplink: jest.fn(),
  expireDeeplink: jest.fn(),
  parse: jest.fn(),
}));

describe('PendingDeeplinkHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render an empty View', () => {
    const { toJSON } = renderWithProvider(<PendingDeeplinkHandler />, {
      state: {
        engine: {
          backgroundState: {
            ...backgroundState,
            KeyringController: {
              isUnlocked: true,
            },
          },
        },
      },
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('process pending deeplink when app is unlocked and not on lock screen', () => {
    const mockPendingDeeplink = 'metamask://test';
    (DeeplinkManager.getPendingDeeplink as jest.Mock).mockReturnValue(
      mockPendingDeeplink,
    );

    renderWithProvider(<PendingDeeplinkHandler />, {
      state: {
        engine: {
          backgroundState: {
            ...backgroundState,
            KeyringController: {
              isUnlocked: true,
            },
          },
        },
      },
    });

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

    renderWithProvider(<PendingDeeplinkHandler />, {
      state: {
        engine: {
          backgroundState: {
            ...backgroundState,
            KeyringController: {
              isUnlocked: false,
            },
          },
        },
      },
    });

    expect(DeeplinkManager.getPendingDeeplink).toHaveBeenCalled();
    expect(DeeplinkManager.expireDeeplink).not.toHaveBeenCalled();
    expect(DeeplinkManager.parse).not.toHaveBeenCalled();
  });

  it('not process deeplink when on lock screen', () => {
    const mockPendingDeeplink = 'metamask://test';
    (DeeplinkManager.getPendingDeeplink as jest.Mock).mockReturnValue(
      mockPendingDeeplink,
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

    renderWithProvider(<PendingDeeplinkHandler />, {
      state: {
        engine: {
          backgroundState: {
            ...backgroundState,
            KeyringController: {
              isUnlocked: true,
            },
          },
        },
      },
    });

    expect(DeeplinkManager.getPendingDeeplink).toHaveBeenCalled();
    expect(DeeplinkManager.expireDeeplink).not.toHaveBeenCalled();
    expect(DeeplinkManager.parse).not.toHaveBeenCalled();
  });

  it('not process deeplink when there is no pending deeplink', () => {
    (DeeplinkManager.getPendingDeeplink as jest.Mock).mockReturnValue(null);

    renderWithProvider(<PendingDeeplinkHandler />, {
      state: {
        engine: {
          backgroundState: {
            ...backgroundState,
            KeyringController: {
              isUnlocked: true,
            },
          },
        },
      },
    });

    expect(DeeplinkManager.getPendingDeeplink).toHaveBeenCalled();
    expect(DeeplinkManager.expireDeeplink).not.toHaveBeenCalled();
    expect(DeeplinkManager.parse).not.toHaveBeenCalled();
  });
});
