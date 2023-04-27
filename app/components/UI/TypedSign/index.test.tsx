import React from 'react';
import { shallow } from 'enzyme';
import TypedSign from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      PreferencesController: {
        selectedAddress: '0x0',
      },
    },
  },
};
const store = mockStore(initialState);

describe('TypedSign', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <TypedSign
          currentPageInformation={{ title: 'title', url: 'url' }}
          messageParams={{
            data: { type: 'string', name: 'Message', value: 'Hi, Alice!' },
          }}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
