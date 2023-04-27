import React from 'react';
import { shallow } from 'enzyme';
import PersonalSign from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

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

describe('PersonalSign', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <PersonalSign
          currentPageInformation={{ title: 'title', url: 'url' }}
          messageParams={{
            data: 'message',
            from: '0x0',
            origin: 'origin',
            metamaskId: 'id',
          }}
          onConfirm={() => ({})}
          onCancel={() => ({})}
          selectedAddress="0x0"
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
