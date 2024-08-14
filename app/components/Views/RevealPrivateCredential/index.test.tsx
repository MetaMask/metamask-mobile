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

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn(),
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
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders reveal private key correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <RevealPrivateCredential
          route={{
            params: {
              credentialName: 'private_key',
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

  it('renders reveal SRP correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <RevealPrivateCredential
          route={{
            params: {
              credentialName: 'seed_phrase',
            },
          }}
          navigation={null}
          cancel={() => null}
          credentialName={'seed_phrase'}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
