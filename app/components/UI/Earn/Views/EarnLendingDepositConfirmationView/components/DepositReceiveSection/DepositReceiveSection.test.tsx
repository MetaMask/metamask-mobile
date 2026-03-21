import React from 'react';
import DepositReceiveSection, { DepositReceiveSectionProps } from './index';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { MOCK_USDC_MAINNET_ASSET } from '../../../../../Stake/__mocks__/stakeMockData';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

describe('DepositReceiveSection', () => {
  const mockInitialState = {
    engine: {
      backgroundState,
    },
  };

  const defaultProps: DepositReceiveSectionProps = {
    token: MOCK_USDC_MAINNET_ASSET,
    receiptTokenName: 'Aave v3 USDC Coin',
    receiptTokenAmountFiat: '$10.00',
    receiptTokenAmount: '10 AETHUSDC',
  };

  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <DepositReceiveSection {...defaultProps} />,
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
