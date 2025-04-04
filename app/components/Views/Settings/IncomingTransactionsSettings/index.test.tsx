import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import Networks from '../../../../util/networks';
import { MAINNET, LINEA_MAINNET } from '../../../../../app/constants/network';
import IncomingTransactionsSettings from './';
import {
  INCOMING_MAINNET_TOGGLE,
  INCOMING_LINEA_MAINNET_TOGGLE,
} from './index.constants';

let mockSetEnableNetworkIncomingTransactions: jest.Mock;

beforeEach(() => {
  mockSetEnableNetworkIncomingTransactions.mockClear();
});

const mockEngine = Engine;

jest.mock('../../../../core/Engine', () => {
  mockSetEnableNetworkIncomingTransactions = jest.fn();
  return {
    init: () => mockEngine.init({}),
    context: {
      PreferencesController: {
        setEnableNetworkIncomingTransactions:
          mockSetEnableNetworkIncomingTransactions,
      },
    },
  };
});

describe('IncomingTransactionsSettings', () => {
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
        NetworkController: {
          networkConfigurationsByChainId: {
            [Networks[MAINNET].chainId]: {
              blockExplorerUrls: [],
              chainId: Networks[MAINNET].chainId,
              defaultRpcEndpointIndex: 0,
              name: 'Mainnet',
              nativeCurrency: 'ETH',
              rpcEndpoints: [
                {
                  url: 'some url',
                },
              ],
            },
            [Networks[LINEA_MAINNET].chainId]: {
              blockExplorerUrls: [],
              chainId: Networks[LINEA_MAINNET].chainId,
              defaultRpcEndpointIndex: 0,
              name: 'Linea Mainnet',
              nativeCurrency: 'ETH',
              rpcEndpoints: [
                {
                  url: 'some url',
                },
              ],
            },
          },
        },
      },
    },
  };

  it('should render correctly', () => {
    const tree = renderWithProvider(<IncomingTransactionsSettings />, {
      state: initialState,
    });
    expect(tree).toMatchSnapshot();
  });

  describe('Incoming Transactions', () => {
    it('should render incoming transaction toggles for supported networks', () => {
      const { getByTestId } = renderWithProvider(
        <IncomingTransactionsSettings />,
        {
          state: initialState,
        },
      );

      const mainnetToggle = getByTestId(INCOMING_MAINNET_TOGGLE);
      const lineaMainnetToggle = getByTestId(INCOMING_LINEA_MAINNET_TOGGLE);

      expect(mainnetToggle).toBeTruthy();
      expect(lineaMainnetToggle).toBeTruthy();
    });

    it('should toggle incoming transactions for Mainnet', () => {
      const { getByTestId } = renderWithProvider(
        <IncomingTransactionsSettings />,
        {
          state: initialState,
        },
      );

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
      const { getByTestId } = renderWithProvider(
        <IncomingTransactionsSettings />,
        {
          state: initialState,
        },
      );

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
});
