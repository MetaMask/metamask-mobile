import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';

import AddressElement from './';
import Engine from '../../../../core/Engine';
import { renderShortAddress } from '../../../../util/address';

const mockEngine = Engine;

jest.unmock('react-redux');

jest.mock('../../../../core/Engine', () => ({
  init: () => mockEngine.init({}),
  context: {
    NetworkController: {
      provider: {
        sendAsync: () => null,
      },
    },
  },
}));

const initialState = {
  engine: {
    backgroundState: {
      NetworkController: {
        network: '1',
      },
    },
  },
};

const renderComponent = (state: any) =>
  renderWithProvider(
    <AddressElement
      address={'0x1234567890abcdef'}
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
    const address = '0x1234567890abcdef';
    const { getByText } = renderComponent(initialState);
    const addressText = getByText(renderShortAddress(address));
    expect(addressText).toBeDefined();
  });
});
