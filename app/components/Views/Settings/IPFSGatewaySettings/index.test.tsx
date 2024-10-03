import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import IPFSGatewaySettings from './';
import { IPFS_GATEWAY_SECTION, IPFS_GATEWAY_SELECTED } from './index.constants';

let mockSetIsIpfsGatewayEnabled: jest.Mock;
let mockSetIpfsGateway: jest.Mock;

beforeEach(() => {
  mockSetIsIpfsGatewayEnabled.mockClear();
  mockSetIpfsGateway.mockClear();
});

const mockEngine = Engine;

jest.mock('../../../../core/Engine', () => {
  mockSetIsIpfsGatewayEnabled = jest.fn();
  mockSetIpfsGateway = jest.fn();
  return {
    init: () => mockEngine.init({}),
    context: {
      PreferencesController: {
        setIsIpfsGatewayEnabled: mockSetIsIpfsGatewayEnabled,
        setIpfsGateway: mockSetIpfsGateway,
      },
    },
  };
});

jest.mock('../../../../util/general', () => ({
  timeoutFetch: jest.fn(),
}));

describe('IPFSGatewaySettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('should render correctly', () => {
    const tree = renderWithProvider(<IPFSGatewaySettings />, {
      state: initialState,
    });
    expect(tree).toMatchSnapshot();
  });

  describe('IPFS Gateway', () => {
    it('should render IPFS gateway toggle', () => {
      const { getByTestId } = renderWithProvider(<IPFSGatewaySettings />, {
        state: initialState,
      });
      const ipfsGatewayToggle = getByTestId(IPFS_GATEWAY_SECTION);
      expect(ipfsGatewayToggle).toBeTruthy();
    });

    it('should toggle IPFS gateway when switch is pressed', () => {
      const { getByTestId } = renderWithProvider(<IPFSGatewaySettings />, {
        state: initialState,
      });
      const ipfsGatewayToggle = getByTestId(IPFS_GATEWAY_SECTION);

      fireEvent(ipfsGatewayToggle, 'onValueChange', true);
      expect(mockSetIsIpfsGatewayEnabled).toHaveBeenCalledWith(true);

      fireEvent(ipfsGatewayToggle, 'onValueChange', false);
      expect(mockSetIsIpfsGatewayEnabled).toHaveBeenCalledWith(false);
    });

    it('should render IPFS gateway selector when enabled', async () => {
      const { queryByTestId } = renderWithProvider(<IPFSGatewaySettings />, {
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

      await new Promise((resolve) => setTimeout(resolve, 0));

      const ipfsGatewaySelector = queryByTestId(IPFS_GATEWAY_SELECTED);
      expect(ipfsGatewaySelector).toBeNull();
    });

    it('should not render IPFS gateway selector when disabled', () => {
      const { queryByTestId } = renderWithProvider(<IPFSGatewaySettings />, {
        state: initialState,
      });
      const ipfsGatewaySelector = queryByTestId(IPFS_GATEWAY_SELECTED);
      expect(ipfsGatewaySelector).toBeNull();
    });
  });
});
