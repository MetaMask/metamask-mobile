import React from 'react';
import { PayWithRow } from './pay-with-row';
import { TokenPillProps } from '../../token-pill/token-pill';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useNavigation } from '@react-navigation/native';
import { act, fireEvent } from '@testing-library/react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import { Text as MockText } from 'react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../../hooks/pay/useTransactionPayToken');
jest.mock('../../../hooks/pay/useTransactionBridgeQuotes');

jest.mock('../../token-pill/', () => ({
  TokenPill: (props: TokenPillProps) => (
    <MockText>{`${props.address} ${props.chainId}`}</MockText>
  ),
}));

const ADDRESS_MOCK = '0x1234567890abcdef1234567890abcdef12345678';
const CHAIN_ID_MOCK = '0x123';

const STATE_MOCK = {
  engine: {
    backgroundState,
  },
};

function render() {
  return renderWithProvider(<PayWithRow />, { state: STATE_MOCK });
}

describe('PayWithRow', () => {
  const navigateMock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    jest.mocked(useTransactionPayToken).mockReturnValue({
      balanceFiat: '$1.23',
      balanceHuman: '1.23',
      decimals: 18,
      payToken: {
        address: ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
      },
      setPayToken: jest.fn(),
    });

    jest.mocked(useNavigation).mockReturnValue({
      navigate: navigateMock,
    } as never);
  });

  it('renders selected pay token', async () => {
    const { getByText } = render();
    expect(getByText(`${ADDRESS_MOCK} ${CHAIN_ID_MOCK}`)).toBeDefined();
  });

  it('navigates to token picker on token pill click', async () => {
    const { getByText } = render();

    await act(() => {
      fireEvent.press(getByText(`${ADDRESS_MOCK} ${CHAIN_ID_MOCK}`));
    });

    expect(navigateMock).toHaveBeenCalledWith(
      Routes.CONFIRMATION_PAY_WITH_MODAL,
    );
  });
});
