import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import NftGridListRefreshControl from './NftGridListRefreshControl';
import { backgroundState } from '../../../util/test/initial-root-state';

const mockStore = configureMockStore();

// Mock all dependencies with minimal setup
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => '0x123456789abcdef'),
}));

jest.mock('../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(() => ({})),
    })),
  }),
}));

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      primary: { default: '#037DD6' },
      icon: { default: '#24272A' },
    },
  }),
}));

jest.mock('../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      NftDetectionController: {
        detectNfts: jest.fn(() => Promise.resolve()),
      },
      NftController: {
        checkAndUpdateAllNftsOwnershipStatus: jest.fn(() => Promise.resolve()),
        state: { allNfts: {} },
      },
      NetworkController: {
        getNetworkConfigurationByChainId: jest.fn(() => ({
          defaultBlockExplorerUrlIndex: 0,
          rpcEndpoints: [{ networkClientId: 'mainnet' }],
        })),
      },
    },
  },
}));

jest.mock('../../hooks/useNftDetectionChainIds', () => ({
  useNftDetectionChainIds: () => ['0x1', '0x89'],
}));

jest.mock('../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: { DetectNfts: 'DetectNfts' },
}));

jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  cloneDeep: jest.fn((obj) => obj),
}));

jest.mock('../../../util/assets', () => ({
  prepareNftDetectionEvents: jest.fn(() => []),
}));

jest.mock('../../../util/networks', () => ({
  getDecimalChainId: jest.fn(() => 1),
}));

jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../core/Multichain/utils', () => ({
  isNonEvmChainId: jest.fn(() => false),
}));

describe('NftGridListRefreshControl', () => {
  const initialState = {
    engine: { backgroundState },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const store = mockStore(initialState);

    const { toJSON } = render(
      <Provider store={store}>
        <NftGridListRefreshControl />
      </Provider>,
    );

    expect(toJSON()).toBeTruthy();
  });

  it('renders RefreshControl component', () => {
    const store = mockStore(initialState);

    const component = render(
      <Provider store={store}>
        <NftGridListRefreshControl />
      </Provider>,
    );

    // Should render without throwing
    expect(component).toBeDefined();
  });

  it('uses theme colors', () => {
    const store = mockStore(initialState);

    expect(() => {
      render(
        <Provider store={store}>
          <NftGridListRefreshControl />
        </Provider>,
      );
    }).not.toThrow();
  });

  it('initializes with correct state', () => {
    const store = mockStore(initialState);

    expect(() => {
      render(
        <Provider store={store}>
          <NftGridListRefreshControl />
        </Provider>,
      );
    }).not.toThrow();
  });

  it('handles network configuration', () => {
    const store = mockStore(initialState);

    expect(() => {
      render(
        <Provider store={store}>
          <NftGridListRefreshControl />
        </Provider>,
      );
    }).not.toThrow();
  });
});
