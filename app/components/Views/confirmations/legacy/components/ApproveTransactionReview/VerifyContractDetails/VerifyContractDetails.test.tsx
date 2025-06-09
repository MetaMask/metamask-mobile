import React from 'react';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import VerifyContractDetails from './VerifyContractDetails';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: {
        ...backgroundState.AccountsController,
        internalAccounts: {
          ...backgroundState.AccountsController.internalAccounts,
          selectedAccount: '30786334-3935-4563-b064-363339643939',
          accounts: {
            '30786334-3935-4563-b064-363339643939': {
              address: '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272',
            },
          },
        },
      },
      TokensController: {
        allTokens: {
          '0x1': {
            '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272': [],
          },
        },
      },
    },
  },
  settings: {
    primaryCurrency: 'ETH',
  },
};

describe('VerifyContractDetails', () => {
  it('should show the token symbol', () => {
    const { getByText } = renderWithProvider(
      <VerifyContractDetails
        tokenSymbol={'dummy_token_symbol'}
        closeVerifyContractView={() => undefined}
        savedContactListToArray={[]}
        contractAddress={''}
        tokenAddress={''}
        copyAddress={() => undefined}
        toggleBlockExplorer={() => undefined}
        showNickname={() => undefined}
        tokenStandard={''}
        providerType={''}
        providerRpcTarget={''}
        networkConfigurations={{}}
      />,
      { state: initialState },
    );
    expect(getByText('dummy_token_symbol')).toBeDefined();
  });
});
