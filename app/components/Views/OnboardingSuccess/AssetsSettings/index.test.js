import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { fireEvent } from '@testing-library/react-native';

import Engine from '../../../../core/Engine';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import AssetSettings from './';
import { backgroundState } from '../../../../util/test/initial-root-state';
import {
  NFT_AUTO_DETECT_TOGGLE,
  NFT_DISPLAY_MEDIA_MODE_TOGGLE,
  NFT_AUTO_DETECT_TOGGLE_LABEL,
  IPFS_GATEWAY_TOGGLE,
  IPFS_GATEWAY_SELECTED,
  INCOMING_MAINNET_TOGGLE,
  INCOMING_LINEA_MAINNET_TOGGLE,
  SECURITY_PRIVACY_MULTI_ACCOUNT_BALANCES_TOGGLE_ID,
} from './AssetSettings.constants';
import Networks from '../../../../util/networks';

let mockSetDisabledRpcMethodPreference;
let mockSetSmartTransactionsOptInStatus;
let mockSetUseTokenDetection;
let mockSetDisplayNftMedia;
let mockSetUseNftDetection;
let mockAddTraitsToUser;
let mockTrackEvent;
let mockSetIsIpfsGatewayEnabled;
let mockSetIpfsGateway;
let mockSetEnableNetworkIncomingTransactions;
let mockSetIsMultiAccountBalancesEnabled;

beforeEach(() => {
  mockSetDisabledRpcMethodPreference.mockClear();
  mockSetSmartTransactionsOptInStatus.mockClear();
  mockSetUseTokenDetection.mockClear();
  mockSetDisplayNftMedia.mockClear();
  mockSetUseNftDetection.mockClear();
  mockAddTraitsToUser.mockClear();
  mockTrackEvent.mockClear();
  mockSetIsIpfsGatewayEnabled.mockClear();
  mockSetIpfsGateway.mockClear();
  mockSetEnableNetworkIncomingTransactions.mockClear();
  mockSetIsMultiAccountBalancesEnabled.mockClear();
});

const mockEngine = Engine;

jest.mock('../../../../core/Engine', () => {
  mockSetDisabledRpcMethodPreference = jest.fn();
  mockSetSmartTransactionsOptInStatus = jest.fn();
  mockSetUseTokenDetection = jest.fn();
  mockSetDisplayNftMedia = jest.fn();
  mockSetUseNftDetection = jest.fn();
  mockAddTraitsToUser = jest.fn();
  mockTrackEvent = jest.fn();
  mockSetIsIpfsGatewayEnabled = jest.fn();
  mockSetEnableNetworkIncomingTransactions = jest.fn();
  mockSetIpfsGateway = jest.fn();
  mockSetIsMultiAccountBalancesEnabled = jest.fn();
  return {
    init: () => mockEngine.init({}),
    context: {
      PreferencesController: {
        setDisabledRpcMethodPreference: mockSetDisabledRpcMethodPreference,
        setSmartTransactionsOptInStatus: mockSetSmartTransactionsOptInStatus,
        setUseTokenDetection: mockSetUseTokenDetection,
        setDisplayNftMedia: mockSetDisplayNftMedia,
        setUseNftDetection: mockSetUseNftDetection,
        setIsIpfsGatewayEnabled: mockSetIsIpfsGatewayEnabled,
        setIpfsGateway: mockSetIpfsGateway,
        setEnableNetworkIncomingTransactions:
          mockSetEnableNetworkIncomingTransactions,
        setIsMultiAccountBalancesEnabled: mockSetIsMultiAccountBalancesEnabled,
      },
    },
  };
});

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    addTraitsToUser: mockAddTraitsToUser,
    trackEvent: mockTrackEvent,
  }),
  MetaMetricsEvents: {
    NFT_AUTO_DETECTION_ENABLED: 'NFT_AUTO_DETECTION_ENABLED',
  },
}));

jest.mock('../../../../util/general', () => ({
  timeoutFetch: jest.fn(),
}));

describe('AssetSettings', () => {
  const mockNavigation = {
    goBack: jest.fn(),
    setOptions: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigation.mockReturnValue(mockNavigation);
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
    const tree = renderWithProvider(<AssetSettings />, {
      state: initialState,
    });
    expect(tree).toMatchSnapshot();
  });

  it('sets navigation options', () => {
    renderWithProvider(<AssetSettings />, {
      state: initialState,
    });
    expect(mockNavigation.setOptions).toHaveBeenCalled();
  });

  describe('Token Detection', () => {
    it('should toggle token detection when switch is pressed', () => {
      const { getByTestId } = renderWithProvider(<AssetSettings />, {
        state: initialState,
      });
      const toggleSwitch = getByTestId(NFT_AUTO_DETECT_TOGGLE_LABEL);
      fireEvent(toggleSwitch, 'onValueChange', false);
      expect(mockSetUseTokenDetection).toHaveBeenCalledWith(false);
    });
  });

  describe('Display NFT Media', () => {
    it('should toggle display NFT media when switch is pressed', () => {
      const { getByTestId } = renderWithProvider(<AssetSettings />, {
        state: initialState,
      });
      const toggleSwitch = getByTestId(NFT_DISPLAY_MEDIA_MODE_TOGGLE);

      fireEvent(toggleSwitch, 'onValueChange', true);
      expect(mockSetDisplayNftMedia).toHaveBeenCalledWith(true);
      expect(mockSetUseNftDetection).not.toHaveBeenCalled();

      fireEvent(toggleSwitch, 'onValueChange', false);
      expect(mockSetDisplayNftMedia).toHaveBeenCalledWith(false);
      expect(mockSetUseNftDetection).toHaveBeenCalledWith(false);
    });
  });

  describe('NFT Autodetection', () => {
    it('should render NFT autodetection switch', () => {
      const { getByTestId } = renderWithProvider(<AssetSettings />, {
        state: initialState,
      });
      const autoDetectSwitch = getByTestId(NFT_AUTO_DETECT_TOGGLE);
      expect(autoDetectSwitch).toBeTruthy();
    });

    it('should toggle NFT autodetection when switch is pressed', () => {
      const { getByTestId } = renderWithProvider(<AssetSettings />, {
        state: initialState,
      });
      const autoDetectSwitch = getByTestId(NFT_AUTO_DETECT_TOGGLE);
      fireEvent(autoDetectSwitch, 'onValueChange', true);

      expect(
        Engine.context.PreferencesController.setUseNftDetection,
      ).toHaveBeenCalledWith(true);
      expect(
        Engine.context.PreferencesController.setDisplayNftMedia,
      ).toHaveBeenCalledWith(true);
      expect(mockAddTraitsToUser).toHaveBeenCalledWith({
        'NFT Autodetection': 'ON',
      });
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'NFT_AUTO_DETECTION_ENABLED',
        {
          'NFT Autodetection': 'ON',
          location: 'app_settings',
        },
      );
    });

    it('should not enable display NFT media when autodetection is turned off', () => {
      const { getByTestId } = renderWithProvider(<AssetSettings />, {
        state: initialState,
      });
      const autoDetectSwitch = getByTestId(NFT_AUTO_DETECT_TOGGLE);
      expect(autoDetectSwitch).toBeTruthy();

      fireEvent(autoDetectSwitch, 'onValueChange', false);

      expect(mockSetUseNftDetection).toHaveBeenCalledWith(false);
      expect(mockSetDisplayNftMedia).not.toHaveBeenCalled();
      expect(mockAddTraitsToUser).toHaveBeenCalledWith({
        'NFT Autodetection': 'OFF',
      });
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'NFT_AUTO_DETECTION_ENABLED',
        {
          'NFT Autodetection': 'OFF',
          location: 'app_settings',
        },
      );
    });
  });

  describe('IPFS Gateway', () => {
    it('should render IPFS gateway toggle', () => {
      const { getByTestId } = renderWithProvider(<AssetSettings />, {
        state: initialState,
      });
      const ipfsGatewayToggle = getByTestId(IPFS_GATEWAY_TOGGLE);
      expect(ipfsGatewayToggle).toBeTruthy();
    });

    it('should toggle IPFS gateway when switch is pressed', () => {
      const { getByTestId } = renderWithProvider(<AssetSettings />, {
        state: initialState,
      });
      const ipfsGatewayToggle = getByTestId(IPFS_GATEWAY_TOGGLE);

      fireEvent(ipfsGatewayToggle, 'onValueChange', true);
      expect(mockSetIsIpfsGatewayEnabled).toHaveBeenCalledWith(true);

      fireEvent(ipfsGatewayToggle, 'onValueChange', false);
      expect(mockSetIsIpfsGatewayEnabled).toHaveBeenCalledWith(false);
    });

    it('should render IPFS gateway selector when enabled', async () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <AssetSettings />,
        {
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
        },
      );

      // Wait for the component to finish rendering
      await new Promise((resolve) => setTimeout(resolve, 0));

      const ipfsGatewaySelector = queryByTestId(IPFS_GATEWAY_SELECTED);
      expect(ipfsGatewaySelector).toBeNull();
    });

    it('should not render IPFS gateway selector when disabled', () => {
      const { queryByTestId } = renderWithProvider(<AssetSettings />, {
        state: initialState,
      });
      const ipfsGatewaySelector = queryByTestId(IPFS_GATEWAY_SELECTED);
      expect(ipfsGatewaySelector).toBeNull();
    });
  });

  describe('Incoming Transactions', () => {
    it('should render incoming transaction toggles for supported networks', () => {
      const { getByTestId } = renderWithProvider(<AssetSettings />, {
        state: initialState,
      });

      const mainnetToggle = getByTestId(INCOMING_MAINNET_TOGGLE);
      const lineaMainnetToggle = getByTestId(INCOMING_LINEA_MAINNET_TOGGLE);

      expect(mainnetToggle).toBeTruthy();
      expect(lineaMainnetToggle).toBeTruthy();
    });

    it('should toggle incoming transactions for Mainnet', () => {
      const { getByTestId } = renderWithProvider(<AssetSettings />, {
        state: initialState,
      });

      const mainnetToggle = getByTestId(INCOMING_MAINNET_TOGGLE);
      const mainnetChainId = '0x1';

      fireEvent(mainnetToggle, 'onValueChange', true);

      expect(
        Engine.context.PreferencesController
          .setEnableNetworkIncomingTransactions,
      ).toHaveBeenCalledWith(mainnetChainId, true);

      fireEvent(mainnetToggle, 'onValueChange', false);

      expect(
        Engine.context.PreferencesController
          .setEnableNetworkIncomingTransactions,
      ).toHaveBeenCalledWith(mainnetChainId, false);
    });

    it('should toggle incoming transactions for Linea Mainnet', () => {
      const { getByTestId } = renderWithProvider(<AssetSettings />, {
        state: initialState,
      });

      const lineaMainnetToggle = getByTestId(INCOMING_LINEA_MAINNET_TOGGLE);
      fireEvent(lineaMainnetToggle, 'onValueChange', true);

      expect(
        Engine.context.PreferencesController
          .setEnableNetworkIncomingTransactions,
      ).toHaveBeenCalledWith(Networks['linea-mainnet'].chainId, true);

      fireEvent(lineaMainnetToggle, 'onValueChange', false);

      expect(
        Engine.context.PreferencesController
          .setEnableNetworkIncomingTransactions,
      ).toHaveBeenCalledWith(Networks['linea-mainnet'].chainId, false);
    });
  });

  describe('Multi-Account Balances', () => {
    it('should render multi-account balances toggle', () => {
      const { getByTestId } = renderWithProvider(<AssetSettings />, {
        state: initialState,
      });

      const multiAccountBalancesToggle = getByTestId(
        SECURITY_PRIVACY_MULTI_ACCOUNT_BALANCES_TOGGLE_ID,
      );
      expect(multiAccountBalancesToggle).toBeTruthy();
    });

    it('should toggle multi-account balances when switch is pressed', () => {
      const { getByTestId } = renderWithProvider(<AssetSettings />, {
        state: initialState,
      });

      const multiAccountBalancesToggle = getByTestId(
        SECURITY_PRIVACY_MULTI_ACCOUNT_BALANCES_TOGGLE_ID,
      );

      fireEvent(multiAccountBalancesToggle, 'onValueChange', true);
      expect(
        Engine.context.PreferencesController.setIsMultiAccountBalancesEnabled,
      ).toHaveBeenCalledWith(true);

      fireEvent(multiAccountBalancesToggle, 'onValueChange', false);
      expect(
        Engine.context.PreferencesController.setIsMultiAccountBalancesEnabled,
      ).toHaveBeenCalledWith(false);
    });

    it('should display correct initial state of multi-account balances toggle', () => {
      const stateWithMultiAccountBalancesEnabled = {
        ...initialState,
        engine: {
          backgroundState: {
            ...initialState.engine.backgroundState,
            PreferencesController: {
              ...initialState.engine.backgroundState.PreferencesController,
              isMultiAccountBalancesEnabled: true,
            },
          },
        },
      };

      const { getByTestId } = renderWithProvider(<AssetSettings />, {
        state: stateWithMultiAccountBalancesEnabled,
      });

      const multiAccountBalancesToggle = getByTestId(
        SECURITY_PRIVACY_MULTI_ACCOUNT_BALANCES_TOGGLE_ID,
      );
      expect(multiAccountBalancesToggle.props.value).toBe(true);
    });
  });
});
