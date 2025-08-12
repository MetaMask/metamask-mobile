import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import IPFSGatewaySettings from './';
import { IPFS_GATEWAY_SECTION, IPFS_GATEWAY_SELECTED } from './index.constants';
import { timeoutFetch } from '../../../../util/general';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      setIsIpfsGatewayEnabled: jest.fn(),
      setIpfsGateway: jest.fn(),
    },
  },
}));

jest.mock('../../../../util/general', () => ({
  timeoutFetch: jest.fn(),
}));

describe('IPFSGatewaySettings', () => {
  const initialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
        PreferencesController: {
          ...backgroundState.PreferencesController,
          useTokenDetection: true,
          displayNftMedia: false,
          useNftDetection: false,
        },
      },
    },
    network: {
      provider: {
        chainId: '1',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(<IPFSGatewaySettings />, {
      state: initialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders IPFS gateway toggle switch', () => {
    const { getByTestId } = renderWithProvider(<IPFSGatewaySettings />, {
      state: initialState,
    });
    expect(getByTestId(IPFS_GATEWAY_SECTION)).toBeTruthy();
  });

  it('toggles IPFS gateway when switch is pressed', () => {
    const { getByTestId } = renderWithProvider(<IPFSGatewaySettings />, {
      state: initialState,
    });

    const toggleSwitch = getByTestId(IPFS_GATEWAY_SECTION);
    fireEvent(toggleSwitch, 'onValueChange', true);
    expect(Engine.context.PreferencesController.setIsIpfsGatewayEnabled).toHaveBeenCalledWith(true);

    fireEvent(toggleSwitch, 'onValueChange', false);
    expect(Engine.context.PreferencesController.setIsIpfsGatewayEnabled).toHaveBeenCalledWith(false);
  });

  it('renders IPFS gateway selector when enabled', async () => {
    const { getByTestId } = renderWithProvider(<IPFSGatewaySettings />, {
      state: {
        ...initialState,
        engine: {
          backgroundState: {
            ...initialState.engine.backgroundState,
            PreferencesController: {
              ...initialState.engine.backgroundState.PreferencesController,
              isIpfsGatewayEnabled: true,
            },
          },
        },
      },
    });

    await waitFor(() => expect(getByTestId(IPFS_GATEWAY_SELECTED)).toBeTruthy(), { timeout: 3000 });

  });

  it('does not render IPFS gateway selector when disabled', () => {
    const { queryByTestId } = renderWithProvider(<IPFSGatewaySettings />, {
      state: initialState,
    });
    expect(queryByTestId(IPFS_GATEWAY_SELECTED)).toBeNull();
  });

  it('calls timeoutFetch with correct parameters', async () => {
    renderWithProvider(<IPFSGatewaySettings />, {
      state: {
        ...initialState,
        engine: {
          backgroundState: {
            ...initialState.engine.backgroundState,
            PreferencesController: {
              ...initialState.engine.backgroundState.PreferencesController,
              isIpfsGatewayEnabled: true,
            },
          },
        },
      },
    });

    await waitFor(() => {
      expect(timeoutFetch).toHaveBeenCalledWith(
          expect.stringContaining('https://'),
          expect.any(Object),
          1200
      );
    }, { timeout: 3000 });
  });
});
