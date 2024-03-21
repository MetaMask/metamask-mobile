import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

import AddressElement from '.';
import Engine from '../../../../../core/Engine';
import { renderShortAddress } from '../../../../../util/address';
import initialBackgroundState from '../../../../../util/test/initial-background-state.json';

const mockEngine = Engine;

jest.unmock('react-redux');

jest.mock('../../../../../core/Engine', () => ({
  init: () => mockEngine.init({}),
  context: {
    NetworkController: {
      getProviderAndBlockTracker: jest.fn().mockImplementation(() => ({
        provider: {
          sendAsync: () => null,
        },
      })),
    },
    KeyringController: {
      state: {
        keyrings: [],
      },
    },
  },
}));

const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};

const renderComponent = (state: any) =>
  renderWithProvider(
    <AddressElement
      address={'0xd018538C87232FF95acbCe4870629b75640a78E7'}
      onAccountPress={() => null}
      onAccountLongPress={() => null}
      testID="address-element"
    />,
    { state },
  );

describe('AddressElement', () => {
  it('should render correctly', () => {
    const { toJSON } = renderComponent(initialState);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render the address', () => {
    const address = '0xd018538C87232FF95acbCe4870629b75640a78E7';
    const { getByText } = renderComponent(initialState);
    const addressText = getByText(renderShortAddress(address));
    expect(addressText).toBeDefined();
  });
});
