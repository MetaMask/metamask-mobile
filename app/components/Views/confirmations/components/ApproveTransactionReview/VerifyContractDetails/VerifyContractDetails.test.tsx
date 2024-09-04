import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import VerifyContractDetails from './VerifyContractDetails';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import mockedEngine from '../../../../../../core/__mocks__/MockedEngine';

const initialState = {
  engine: {
    backgroundState,
  },
  settings: {
    primaryCurrency: 'ETH',
  },
};

jest.mock('../../../../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

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
