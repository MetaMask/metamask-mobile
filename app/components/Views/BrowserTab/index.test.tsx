import React from 'react';
import { shallow } from 'enzyme';
import { BrowserTab } from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

const mockInitialState = {
  browser: { activeTab: '' },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
  transaction: {
    selectedAsset: '',
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockImplementation(() => mockInitialState),
}));

const mockStore = configureMockStore();
const store = mockStore(mockInitialState);

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
