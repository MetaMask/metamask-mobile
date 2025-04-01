import React from 'react';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
// eslint-disable-next-line import/no-namespace
import * as AddressUtils from '../../../../../../../util/address';
import AccountNetworkInfoCollapsed from './AccountNetworkInfoCollapsed';

jest.mock('../../../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../../../util/address'),
  getLabelTextByAddress: jest.fn(),
}));

jest.mock('../../../../../../../core/Engine', () => ({
  getTotalFiatAccountBalance: () => ({ tokenFiat: 10 }),
}));

describe('AccountNetworkInfoCollapsed', () => {
  it('renders correctly', async () => {
    const { getByText } = renderWithProvider(<AccountNetworkInfoCollapsed isSignatureRequest />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('0x935E...5477')).toBeDefined();
    expect(getByText('Ethereum Mainnet')).toBeDefined();
  });

  it('displays account label', async () => {
    const MOCK_ACCOUNT_LABEL = 'ledger_label';
    jest
      .spyOn(AddressUtils, 'getLabelTextByAddress')
      .mockReturnValue(MOCK_ACCOUNT_LABEL);
    const { getByText } = renderWithProvider(<AccountNetworkInfoCollapsed isSignatureRequest />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText(MOCK_ACCOUNT_LABEL)).toBeDefined();
  });
});
