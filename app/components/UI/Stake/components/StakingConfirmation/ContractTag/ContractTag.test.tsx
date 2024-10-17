import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import ContractTag from './ContractTag';

const MOCK_STAKING_CONTRACT_NAME = 'MM Pooled Staking';

describe('ContractTag', () => {
  it('render matches snapshot', () => {
    const { getByText, toJSON } = renderWithProvider(
      <ContractTag contractName={MOCK_STAKING_CONTRACT_NAME} />,
    );

    expect(getByText(MOCK_STAKING_CONTRACT_NAME)).toBeDefined();

    expect(toJSON()).toMatchSnapshot();
  });
});
