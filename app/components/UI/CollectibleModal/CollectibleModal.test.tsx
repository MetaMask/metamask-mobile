import React from 'react';

import CollectibleModal from './CollectibleModal';

import renderWithProvider from '../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const mockInitialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};

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
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<CollectibleModal />, {
      state: mockInitialState,
    });

    expect(toJSON()).toMatchSnapshot();
  });
});
