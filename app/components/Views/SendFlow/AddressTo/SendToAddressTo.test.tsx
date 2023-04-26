import React from 'react';
import configureMockStore from 'redux-mock-store';
import { render } from 'enzyme';
import SendToAddressTo from './';
import { Provider } from 'react-redux';
import Engine from '../../../../core/Engine';

Engine.init();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigation: {},
  }),
  createNavigatorFactory: () => ({}),
}));

const initialState = {
  settings: {},
  engine: {
    backgroundState: {
      AccountTrackerController: {
        accounts: {
          '0x0': {
            balance: 200,
          },
        },
      },
      AddressBookController: {
        addressBook: {},
      },
      PreferencesController: {
        selectedAddress: '0x0',
        identities: {
          '0x0': {
            address: '0x0',
            name: 'Account 1',
          },
        },
      },
    },
  },
};

const mockStore = configureMockStore();
const store = mockStore(initialState);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(initialState)),
}));

describe('SendToAddressTo', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <Provider store={store}>
        <SendToAddressTo
          inputRef={undefined}
          highlighted={false}
          addressToReady={false}
          toSelectedAddress={undefined}
          toSelectedAddressName={undefined}
          onSubmit={() => undefined}
          inputWidth={undefined}
          confusableCollectionArray={undefined}
          isFromAddressBook={undefined}
          updateParentState={undefined}
          onToSelectedAddressChange={undefined}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
