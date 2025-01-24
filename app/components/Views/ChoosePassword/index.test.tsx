import React from 'react';
import { shallow } from 'enzyme';
import ChoosePassword from './';
import configureMockStore from 'redux-mock-store';
import { ONBOARDING, PROTECT } from '../../../constants/navigation';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

const mockStore = configureMockStore();
const initialState = {
  user: {
    passwordSet: true,
    seedphraseBackedUp: false,
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};
const store = mockStore(initialState);

describe('ChoosePassword', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <ChoosePassword route={{ params: [ONBOARDING, PROTECT] }} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
