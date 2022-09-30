import React from 'react';
import { shallow } from 'enzyme';
import { BrowserTab } from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

jest.useFakeTimers();

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
    const wrapper = shallow(
      <Provider store={store}>
        <BrowserTab initialUrl="https://metamask.io" />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
