import React from 'react';
import { shallow } from 'enzyme';
import configureMockStore from 'redux-mock-store';
import { RevealPrivateCredential } from './';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState,
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
          credentialName={'private_key'}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
