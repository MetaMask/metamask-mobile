import '../../UI/Bridge/_mocks_/initialState';
import React from 'react';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import SwapsAmountView from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RootState } from '../../../reducers';
import { QuoteViewSelectorIDs } from '../../../../e2e/selectors/swaps/QuoteView.selectors';
import { fireEvent } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      setOptions: jest.fn(),
      pop: jest.fn(),
      navigate: jest.fn(),
    }),
    useRoute: () => ({
      params: {
        sourceToken: '0x0000000000000000000000000000000000000000',
      },
    }),
  };
});

jest.mock('../../../core/Engine', () => ({
  context: {
    SwapsController: {
      fetchAggregatorMetadataWithCache: jest.fn(),
      fetchTopAssetsWithCache: jest.fn(),
      fetchTokenWithCache: jest.fn(),
    },
  },
}));

const mockInitialState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

describe('SwapsAmountView', () => {
  it('renders', async () => {
    const { getByTestId } = renderWithProvider(<SwapsAmountView />, {
      state: mockInitialState,
    });
    expect(
      getByTestId(QuoteViewSelectorIDs.SOURCE_TOKEN_SELECTOR),
    ).toBeDefined();
  });

  it('truncates decimals to 5 when clicking Max button', async () => {
    // Given a user has ETH balance with many decimal places
    const stateWithBalance: DeepPartial<RootState> = {
      ...mockInitialState,
      engine: {
        backgroundState: {
          ...backgroundState,
          SwapsController: {
            tokens: [
              {
                address: '0x0000000000000000000000000000000000000000',
                symbol: 'ETH',
                decimals: 18,
                iconUrl: '',
                occurrences: 10,
              },
            ],
          },
          AccountTrackerController: {
            accountsByChainId: {
              '0x1': {
                '0x123': {
                  balance: '1234567890123456789', // 1.234567890123456789 ETH
                },
              },
            },
          },
          PreferencesController: {
            selectedAddress: '0x123',
          },
        },
      },
      swaps: {
        '0x1': {
          isLive: true,
        },
      },
    };

    // When they click the Max button
    const { findByText } = renderWithProvider(<SwapsAmountView />, {
      state: stateWithBalance,
    });

    const maxButton = await findByText('swaps.use_max');
    fireEvent.press(maxButton);

    // Then the amount should be truncated to 5 decimals for better UX
    // 1.234567890123456789 ETH → 1.23457 ETH (5 decimals, rounded)
    const amountText = await findByText(/1\.23457/);
    expect(amountText).toBeDefined();
  });
});
