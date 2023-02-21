import React from 'react';
import { shallow } from 'enzyme';
import { EnableAutomaticSecurityChecksModal } from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});

describe('EnableAutomaticSecurityChecksModal', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <EnableAutomaticSecurityChecksModal />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
