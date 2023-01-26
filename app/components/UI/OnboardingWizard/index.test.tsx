import React from 'react';
import OnboardingWizard from './';
import { shallow } from 'enzyme';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  wizard: {
    step: 1,
  },
  security: {
    isAutomaticSecurityChecksModalOpen: false,
  },
};
const store = mockStore(initialState);

describe('OnboardingWizard', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <OnboardingWizard />
      </Provider>,
    );
    expect(wrapper.dive()).toMatchSnapshot();
  });
});
