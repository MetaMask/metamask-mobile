import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import configureMockStore from 'redux-mock-store';
import OfflineMode from './';

const mockStore = configureMockStore();
const initialState = {
  infuraAvailability: {
    isBlocked: false,
  },
};
const store = mockStore(initialState);

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => {
    return {
      isInternetReachable: false,
    };
  },
}));

describe('OfflineMode', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<OfflineMode />);
    expect(toJSON()).toMatchSnapshot();
  });
});
