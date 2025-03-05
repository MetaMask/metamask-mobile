import React from 'react';
import DeleteWalletModal from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';

const mockInitialState = {
  engine: { backgroundState },
  security: {
    dataCollectionForMarketing: false,
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => jest.fn(),
  useSelector: jest.fn(),
}));
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

describe('DeleteWalletModal', () => {
  it('should render correctly', () => {
    const wrapper = renderWithProvider(<DeleteWalletModal />, {
      state: mockInitialState,
    });

    expect(wrapper).toMatchSnapshot();
  });
});
