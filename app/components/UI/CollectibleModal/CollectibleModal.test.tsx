import React from 'react';
import { CHAIN_IDS } from '@metamask/transaction-controller';

import CollectibleModal from './CollectibleModal';

import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { collectiblesSelector } from '../../../reducers/collectibles';
import {
  selectDisplayNftMedia,
  selectIsIpfsGatewayEnabled,
} from '../../../selectors/preferencesController';
import { useSelector } from 'react-redux';
import { selectSendRedesignFlags } from '../../../selectors/featureFlagController/confirmations';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { mockNetworkState } from '../../../util/test/network';

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      NetworkController: {
        ...mockNetworkState({
          chainId: CHAIN_IDS.MAINNET,
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
        }),
      },
    },
  },
};

// Set two collectibles with the same address
const collectibles = [
  { name: 'Lion', tokenId: 6903, address: '0x123' },
  { name: 'Leopard', tokenId: 6904, address: '0x123' },
];

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
const mockedNavigate = jest.fn();
const mockedReplace = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');

  const navigation = {
    params: {
      contractName: 'Opensea',
      collectible: { name: 'Leopard', tokenId: 6904, address: '0x123' },
    },
  };
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockedNavigate,
      replace: mockedReplace,
    }),
    useRoute: jest.fn(() => ({ params: navigation.params })),
  };
});

describe('CollectibleModal', () => {
  afterEach(() => {
    (useSelector as jest.Mock).mockClear();
  });
  it('renders correctly', async () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSendRedesignFlags) return { enabled: false };
    });
    const { toJSON } = renderWithProvider(<CollectibleModal />, {
      state: mockInitialState,
    });

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders the correct token name and ID', async () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === collectiblesSelector) return collectibles;
      if (selector === selectIsIpfsGatewayEnabled) return true;
      if (selector === selectDisplayNftMedia) return true;
      if (selector === selectSendRedesignFlags) return { enabled: false };
    });

    const { findAllByText } = renderWithProvider(<CollectibleModal />, {
      state: mockInitialState,
    });

    expect(await findAllByText('#6904')).toBeDefined();
    expect(await findAllByText('Leopard')).toBeDefined();
  });

  it('tracks NFT Details Opened event with mobile-nft-list source when provided', () => {
    const mockTrackEvent = jest.fn();
    const mockCreateEventBuilder = jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({
        properties: { chain_id: 1, source: 'mobile-nft-list' },
      }),
    }));

    jest.doMock('../../hooks/useMetrics', () => ({
      useMetrics: () => ({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    }));

    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSendRedesignFlags) return { enabled: false };
      return {};
    });

    renderWithProvider(<CollectibleModal />, {
      state: mockInitialState,
    });

    expect(mockCreateEventBuilder).toHaveBeenCalled();
  });

  it('tracks NFT Details Opened event with mobile-nft-list-page source when provided', () => {
    const mockTrackEvent = jest.fn();
    const mockCreateEventBuilder = jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({
        properties: { chain_id: 1, source: 'mobile-nft-list-page' },
      }),
    }));

    jest.doMock('../../hooks/useMetrics', () => ({
      useMetrics: () => ({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    }));

    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSendRedesignFlags) return { enabled: false };
      return {};
    });

    renderWithProvider(<CollectibleModal />, {
      state: mockInitialState,
    });

    expect(mockCreateEventBuilder).toHaveBeenCalled();
  });
});
