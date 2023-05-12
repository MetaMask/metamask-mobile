import React from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

import { render } from '@testing-library/react-native';

import SendFlowAddressTo from './';

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

describe('SendFlowAddressTo', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <Provider store={store}>
        <SendFlowAddressTo
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
