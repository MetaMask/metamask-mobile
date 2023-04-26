import React from 'react';
import { render } from '@testing-library/react-native';
import { BrowserTab } from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const initialState = {
  browser: { activeTab: '' },
  engine: {
    backgroundState: {
      PermissionController: {
        subjects: {},
      },
    },
  },
  transaction: {
    selectedAsset: '',
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockImplementation(() => initialState),
}));

const mockStore = configureMockStore();
const store = mockStore(initialState);

describe('Browser', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <BrowserTab initialUrl="https://metamask.io" />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
