import React from 'react';
import { shallow } from 'enzyme';
import TokenImage from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
  settings: {
    primaryCurrency: 'usd',
  },
};
const store = mockStore(initialState);

describe('TokenImage', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <TokenImage
          asset={{
            address: '0x123',
            symbol: 'ABC',
            decimals: 18,
            image: 'invalid-uri',
          }}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
