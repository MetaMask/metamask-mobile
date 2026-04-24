import React from 'react';

import renderWithProvider from '../../../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../../../util/test/initial-root-state';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ADDRESS_1,
} from '../../../../../../../../util/test/accountsControllerTestUtils';
import Name from '../../../../../../../UI/Name';
import Address from './address';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { NameType } from '../../../../../../../UI/Name/Name.types';

jest.mock(
  '../../../../../../../../selectors/featureFlagController/multichainAccounts',
  () => ({
    selectMultichainAccountsState2Enabled: () => false,
  }),
);

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: {
        ...MOCK_ACCOUNTS_CONTROLLER_STATE,
      },
    },
  },
};

jest.mock('../../../../../../../UI/Name', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('InfoAddress', () => {
  const mockName = jest.mocked(Name);
  it('calls Name component with correct props', async () => {
    renderWithProvider(
      <Address address={MOCK_ADDRESS_1} chainId={CHAIN_IDS.MAINNET} />,
      {
        state: mockInitialState,
      },
    );
    expect(mockName).toHaveBeenCalledWith(
      expect.objectContaining({
        value: MOCK_ADDRESS_1,
        variation: CHAIN_IDS.MAINNET,
        type: NameType.EthereumAddress,
      }),
      expect.anything(),
    );
  });
});
