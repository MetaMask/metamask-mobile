import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import SwapsAmountView from './index';
import initialRootState from '../../../util/test/initial-root-state';
import renderWithProvider from '../../../util/test/renderWithProvider';

const mockStore = configureMockStore();

const store = mockStore(initialRootState);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    setOptions: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

describe('Swaps', () => {
  it('should render correctly', () => {
    const wrapper = renderWithProvider(() => <SwapsAmountView />);

    expect(wrapper).toMatchSnapshot();
  });
});
