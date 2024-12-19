import React from 'react';
import { swapsUtils } from '@metamask/swaps-controller/';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import Asset from './';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      TokensController: {
        allTokens: {
          '0x1': {
            '0xc4966c0d659d99699bfd7eb54d8fafee40e4a756': [],
          },
        },
      },
    },
  },
};

jest.mock('../../../core/Engine', () => {
  const {
    MOCK_ADDRESS_1,
  } = require('../../../util/test/accountsControllerTestUtils');

  return {
    context: {
      KeyringController: {
        getOrAddQRKeyring: async () => ({ subscribe: () => ({}) }),
        state: {
          keyrings: [
            {
              accounts: [MOCK_ADDRESS_1],
            },
          ],
        },
      },
    },
    controllerMessenger: {
      subscribe: jest.fn(),
    },
  };
});

describe('Asset', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <Asset
        navigation={{ setOptions: jest.fn() }}
        route={{
          params: {
            symbol: 'ETH',
            address: 'something',
            isETH: true,
            chainId: '0x1',
          },
        }}
      />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should call navigation.setOptions on mount', () => {
    const mockSetOptions = jest.fn();
    renderWithProvider(
      <Asset
        navigation={{ setOptions: mockSetOptions }}
        route={{
          params: {
            symbol: 'BNB',
            address: 'something',
            isETH: true,
            chainId: '0x1',
          },
        }}
        transactions={[]}
      />,
      {
        state: mockInitialState,
      },
    );

    expect(mockSetOptions).toHaveBeenCalled();
  });

  it('should not display swaps button if the asset is not allowed', () => {
    jest.spyOn(swapsUtils, 'fetchSwapsFeatureFlags').mockRejectedValue('error');
    const { toJSON } = renderWithProvider(
      <Asset
        navigation={{ setOptions: jest.fn() }}
        route={{
          params: {
            symbol: 'AVAX',
            address: 'something',
            isETH: false,
            chainId: '0x1',
          },
        }}
      />,
      {
        state: mockInitialState,
      },
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
