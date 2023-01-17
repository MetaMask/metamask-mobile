import React from 'react';
import { shallow } from 'enzyme';
import configureMockStore from 'redux-mock-store';
import { RevealPrivateCredential } from './';
import { Provider } from 'react-redux';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      PreferencesController: {
        selectedAddress: '0xe7E125654064EEa56229f273dA586F10DF96B0a1',
      },
    },
  },
  user: {
    passwordSet: false,
  },
};
const store = mockStore(initialState);

describe('RevealPrivateCredential', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <RevealPrivateCredential
          route={{
            params: {
              privateCredentialName: 'private_key',
            },
          }}
          navigation={null}
          cancel={() => null}
          navBarDisabled={false}
          credentialName={'private_key'}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
