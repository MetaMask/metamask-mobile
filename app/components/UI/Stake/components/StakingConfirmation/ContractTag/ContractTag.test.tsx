import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import ContractTag from './ContractTag';

const MOCK_STAKING_CONTRACT_NAME = 'MM Pooled Staking';

const MOCK_CONTRACT_ADRESS = '0x0000000000000000000000000000000000000000';

describe('ContractTag', () => {
  it('renders contract name', () => {
    const { getByText } = renderWithProvider(
      <ContractTag
        contractAddress={MOCK_CONTRACT_ADRESS}
        contractName={MOCK_STAKING_CONTRACT_NAME}
      />,
    );

    expect(getByText(MOCK_STAKING_CONTRACT_NAME)).toBeOnTheScreen();
  });
});
