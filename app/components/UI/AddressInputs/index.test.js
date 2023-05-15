import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { AddressFrom, AddressTo } from './index';
jest.mock('../../../util/address', () => ({
  ...jest.requireActual('../../../util/address'),
  isQRHardwareAccount: jest.fn(),
}));

describe('AddressInputs', () => {
  describe('AddressFrom', () => {
    it('should match default snapshot', async () => {
      const container = renderWithProvider(
        <AddressFrom
          fromAccountAddress="0x10e08af911f2e48948"
          fromAccountBalance="0x5"
          fromAccountName="DUMMY_ACCOUNT"
        />,
        {},
      );
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot when layout is vertical', () => {
      const container = renderWithProvider(
        <AddressFrom
          fromAccountAddress="0x10e08af911f2e48948"
          fromAccountBalance="0x5"
          fromAccountName="DUMMY_ACCOUNT"
          layout="vertical"
        />,
        {},
      );
      expect(container).toMatchSnapshot();
    });
  });

  describe('AddressTo', () => {
    it('should match default snapshot', () => {
      const container = renderWithProvider(
        <AddressTo
          displayExclamation
          isConfirmScreen
          toAddressName="DUMMY_ACCOUNT"
          toSelectedAddress="0x10e08af911f2e48948"
        />,
        { state: {} },
      );
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot when layout is vertical', () => {
      const container = renderWithProvider(
        <AddressTo
          displayExclamation
          isConfirmScreen
          toAddressName="DUMMY_ACCOUNT"
          toSelectedAddress="0x10e08af911f2e48948"
          layout="vertical"
        />,
        { state: {} },
      );
      expect(container).toMatchSnapshot();
    });
  });
});
