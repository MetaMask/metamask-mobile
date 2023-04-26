import React from 'react';
import { render } from '@testing-library/react-native';
import AddCustomCollectible from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      PreferencesController: {
        selectedAddress: '0x1',
      },
    },
  },
};
const store = mockStore(initialState);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockImplementation(() => ''),
}));

describe('AddCustomCollectible', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <AddCustomCollectible />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
