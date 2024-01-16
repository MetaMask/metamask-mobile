import React from 'react';

import CollectibleModal from './CollectibleModal';

import renderWithProvider from '../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import { collectiblesSelector } from '../../../reducers/collectibles';
import {
  selectDisplayNftMedia,
  selectIsIpfsGatewayEnabled,
} from '../../../selectors/preferencesController';
import { useSelector } from 'react-redux';

const mockInitialState = {
  engine: {
    backgroundState: initialBackgroundState,
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
  it('should render correctly', async () => {
    const { toJSON } = renderWithProvider(<CollectibleModal />, {
      state: mockInitialState,
    });

    expect(toJSON()).toMatchSnapshot();
  });

  it('should render the correct token name and ID', async () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === collectiblesSelector) return collectibles;
      if (selector === selectIsIpfsGatewayEnabled) return true;
      if (selector === selectDisplayNftMedia) return true;
    });

    const { findAllByText } = renderWithProvider(<CollectibleModal />, {
      state: mockInitialState,
    });

    expect(await findAllByText('#6904')).toBeDefined();
    expect(await findAllByText('Leopard')).toBeDefined();
  });
});
