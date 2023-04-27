import React from 'react';
import { shallow } from 'enzyme';
import GasEducationCarousel from '.';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const store = mockStore({});

describe('GasEducationCarousel', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <GasEducationCarousel navigation={{ getParam: () => false }} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
