import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { validateAddressOrENS } from '../../../../../util/address';
import Engine from '../../../../../core/Engine';
import ContactForm from '.';
import { AddContactViewSelectorsIDs } from '../AddContactView.testIds';

const MOCK_ADDRESS = '0xf55C0d639d99699bFd7EC54d9FAFee40E4d272C4';

jest.mock('../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../util/address'),
  renderShortAddress: jest.fn(
    (address: string) => `0x123...${address.slice(-4)}`,
  ),
  areAddressesEqual: jest.fn(
    (a: string, b: string) => a.toLowerCase() === b.toLowerCase(),
  ),
  validateAddressOrENS: jest.fn(() =>
    Promise.resolve({
      addressError: null,
      toEnsName: null,
      addressReady: true,
      toEnsAddress: null,
      errorContinue: false,
    }),
  ),
  toChecksumAddress: jest.fn((address: string) => address),
}));

jest.mock('../../../../../util/networks', () => ({
  ...jest.requireActual('../../../../../util/networks'),
  getNetworkImageSource: jest.fn(() => ({ uri: 'mock-image-uri' })),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    AddressBookController: {
      set: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
  pop: jest.fn(),
  setParams: jest.fn(),
};

describe('ContactForm memo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves line breaks typed into the memo field', async () => {
    const { findByTestId } = renderWithProvider(
      <ContactForm
        navigation={mockNavigation}
        route={{ params: { mode: 'add' } }}
      />,
      {
        state: {
          engine: {
            backgroundState: {
              ...backgroundState,
              AddressBookController: { addressBook: {} },
            },
          },
          user: { ambiguousAddressEntries: {} },
        },
      },
    );

    fireEvent.changeText(
      await findByTestId(AddContactViewSelectorsIDs.NAME_INPUT),
      'Test Contact',
    );
    fireEvent.changeText(
      await findByTestId(AddContactViewSelectorsIDs.ADDRESS_INPUT),
      MOCK_ADDRESS,
    );
    const memoInput = await findByTestId(AddContactViewSelectorsIDs.MEMO_INPUT);
    expect(memoInput.props.multiline).toBe(true);
    fireEvent.changeText(memoInput, 'First line\nSecond line');

    await waitFor(() => {
      expect(jest.mocked(validateAddressOrENS)).toHaveBeenCalled();
    });

    fireEvent.press(await findByTestId(AddContactViewSelectorsIDs.ADD_BUTTON));

    await waitFor(() => {
      expect(Engine.context.AddressBookController.set).toHaveBeenCalledWith(
        MOCK_ADDRESS,
        'Test Contact',
        '0x1',
        'First line\nSecond line',
      );
    });
  });
});
