import React from 'react';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import QuotesView from './QuotesView';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RootState } from '../../../reducers';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      setOptions: jest.fn(),
      //pop: jest.fn(),
      //navigate: jest.fn(),
    }),
    useRoute: () => ({
      params: {
        sourceTokenAddress: '0x1',
        destinationTokenAddress: '0x2',
        tokens: [
          {
            address: '0x1',
            symbol: 'FROM',
            decimals: 1,
          },
        ],
      },
    }),
    //useLinking: jest.fn(),
  };
});

jest.mock('../../../core/Engine', () => ({
  context: {
    SwapsController: {
      startFetchAndSetQuotes: jest.fn(),
      stopPollingAndResetState: jest.fn(),
    },
  },
}));

const mockInitialState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: {
        ...backgroundState.AccountsController,
        internalAccounts: {
          ...backgroundState.AccountsController.internalAccounts,
          accounts: {
            '0x9999': {
              address: '0x9999',
            },
          },
          selectedAccount: '0x9999',
        },
      },
      AccountTrackerController: {
        ...backgroundState.AccountTrackerController,
        accounts: {
          '0x9999': {
            balance: '0x1000000000',
          },
        },
      },
      SwapsController: {
        ...backgroundState.SwapsController,
        tokens: [
          {
            address: '0x2',
            symbol: 'TO',
            decimals: 1,
          },
        ],
      },
    },
  },
};

describe('QuotesView', () => {
  it('renders', () => {
    const wrapper = renderWithProvider(<QuotesView />, {
      state: mockInitialState,
    });
    expect(wrapper).toMatchSnapshot();
  });
});
