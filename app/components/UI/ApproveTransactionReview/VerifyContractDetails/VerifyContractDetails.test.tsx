import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import VerifyContractDetails from './VerifyContractDetails';

const initialState = {
  engine: {
    backgroundState: {
      TokensController: {
        tokens: [],
      },
    },
  },
  settings: {
    primaryCurrency: 'ETH',
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(initialState)),
}));

const DUMMY_COMPONENT = () => 'DUMMY';

jest.mock(
  '../../../../component-library/components/Icons/Icon/Icon',
  () => DUMMY_COMPONENT,
);

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
        frequentRpcList={[]}
      />,
      {},
    );
    expect(getByText('dummy_token_symbol')).toBeDefined();
  });
});
