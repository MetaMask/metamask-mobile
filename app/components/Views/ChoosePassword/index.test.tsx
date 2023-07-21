import React from 'react';
import { shallow } from 'enzyme';
import ChoosePassword from './';
import configureMockStore from 'redux-mock-store';
import { ONBOARDING, PROTECT } from '../../../constants/navigation';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const initialState = {
  user: {
    passwordSet: true,
    seedphraseBackedUp: false,
  },
  engine: {
    backgroundState: initialBackgroundState,
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
