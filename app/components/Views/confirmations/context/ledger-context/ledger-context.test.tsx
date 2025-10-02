import React from 'react';
import { Text, View } from 'react-native';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as AddressUtils from '../../../../../util/address';
import { LedgerContextProvider, useLedgerContext } from './ledger-context';
import { personalSignatureConfirmationState } from '../../../../../util/test/confirm-data-helpers';
import { Footer } from '../../components/footer';
import { fireEvent } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [
          {
            accounts: ['0x935e73edb9ff52e23bac7f7e043a1ecd06d05477'],
            type: 'Ledger Hardware',
          },
        ],
      },
    },
  },
}));

jest.mock('../../hooks/transactions/useTransactionConfirm', () => ({
  useTransactionConfirm: () => ({
    onConfirm: jest.fn(),
  }),
}));

const MockView = View;
const MockText = Text;

jest.mock('../../components/modals/ledger-sign-modal', () => ({
  __esModule: true,
  default: () => (
    <MockView>
      <MockText>Mock LedgerSignModal</MockText>
    </MockView>
  ),
}));

const mockDeviceId = 'MockDeviceId';
jest.mock('../../../../../core/Ledger/Ledger', () => ({
  getDeviceId: () => Promise.resolve(mockDeviceId),
}));

describe('LedgerContext', () => {
  it('footer get correct value of isLedgerAccount', async () => {
    jest.spyOn(AddressUtils, 'isHardwareAccount').mockReturnValue(true);
    const { getByText } = renderWithProvider(
      <LedgerContextProvider>
        <Footer />
      </LedgerContextProvider>,
      {
        state: personalSignatureConfirmationState,
      },
    );
    expect(getByText('Confirm')).toBeTruthy();
  });

  it('display ledger sign modal when "Confirm" button is clicked in footer', async () => {
    jest.spyOn(AddressUtils, 'isHardwareAccount').mockReturnValue(true);
    const { getByText } = renderWithProvider(
      <LedgerContextProvider>
        <Footer />
      </LedgerContextProvider>,
      {
        state: personalSignatureConfirmationState,
      },
    );
    fireEvent.press(getByText('Confirm'));
    expect(getByText('Mock LedgerSignModal')).toBeTruthy();
  });
});

describe('useLedgerContext', () => {
  it('should throw error is not wrapped in LedgerContextProvider', () => {
    expect(() => {
      useLedgerContext();
    }).toThrow();
  });
});
