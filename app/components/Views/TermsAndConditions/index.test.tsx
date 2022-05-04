import React from 'react';
import { shallow } from 'enzyme';
import TermsAndConditions from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});

describe('TermsAndConditions', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <TermsAndConditions action="import" />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
