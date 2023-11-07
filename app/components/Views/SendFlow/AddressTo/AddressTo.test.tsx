import React from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

import { render } from '@testing-library/react-native';

import SendFlowAddressTo from './';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigation: {},
  }),
  createNavigatorFactory: () => ({}),
}));

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: initialBackgroundState,
  },
};

const mockStore = configureMockStore();
const store = mockStore(mockInitialState);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(mockInitialState)),
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
