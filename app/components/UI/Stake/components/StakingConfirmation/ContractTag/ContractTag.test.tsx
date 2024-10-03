import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import ContractTag from './ContractTag';
import { MOCK_STAKING_CONTRACT_NAME } from '../../../Views/StakeConfirmationView/StakeConfirmationMockData';

describe('ContractTag', () => {
  it('render matches snapshot', () => {
    const { getByText, toJSON } = renderWithProvider(
      <ContractTag name={MOCK_STAKING_CONTRACT_NAME} />,
    );

    expect(getByText(MOCK_STAKING_CONTRACT_NAME)).toBeDefined();

    expect(toJSON()).toMatchSnapshot();
  });
});
