import '../../UI/Bridge/_mocks_/initialState';
import React from 'react';
import { waitFor } from '@testing-library/react-native';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import SwapsAmountView from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RootState } from '../../../reducers';
import { QuoteViewSelectorIDs } from '../../../../e2e/selectors/swaps/QuoteView.selectors';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      setOptions: jest.fn(),
      pop: jest.fn(),
      navigate: jest.fn(),
    }),
    useRoute: () => ({}),
  };
});

const mockAddress = '0x0000000000000000000000000000000000000000';
jest.mock('@metamask/swaps-controller', () => ({
  swapsUtils: {
    fetchSwapsFeatureFlags: jest.fn(() =>
      Promise.resolve({
        ethereum: { mobile_active: true },
      }),
    ),
    getNativeSwapsToken: jest.fn(() => ({
      address: mockAddress,
      symbol: 'ETH',
      decimals: 18,
    })),
    NATIVE_SWAPS_TOKEN_ADDRESS: mockAddress,
  },
  SwapsController: {
    fetchAggregatorMetadataWithCache: jest.fn().mockResolvedValue({}),
    fetchTopAssetsWithCache: jest.fn().mockResolvedValue({}),
    fetchTokenWithCache: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../../../util/device', () => {
  const { default: Device } = jest.requireActual('../../../util/device');
  Device.isIos = jest.fn();
  Device.isAndroid = jest.fn();
  return {
    __esModule: true,
    default: Device,
  };
});

const mockInitialState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

describe('SwapsAmountView', () => {
  it('renders', async () => {
    const component = renderWithProvider(<SwapsAmountView />, {
      state: mockInitialState,
    });

    const { getByTestId } = component;

    await waitFor(() => {
      expect(
        getByTestId(QuoteViewSelectorIDs.SOURCE_TOKEN_SELECTOR),
      ).toBeDefined();
    });
  });
});
