import React from 'react';
import { PayWithRow } from './pay-with-row';
import { TokenIconProps } from '../../token-icon';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useNavigation } from '@react-navigation/native';
import { act, fireEvent } from '@testing-library/react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import { Text as MockText } from 'react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { isHardwareAccount } from '../../../../../../util/address';
import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../../hooks/pay/useTransactionPayToken');
jest.mock('../../../../../../util/address');
jest.mock('../../../hooks/metrics/useConfirmationMetricEvents');

jest.mock('../../token-icon/', () => ({
  TokenIcon: (props: TokenIconProps) => (
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
  const isHardwareAccountMock = jest.mocked(isHardwareAccount);
  const useConfirmationMetricEventsMock = jest.mocked(
    useConfirmationMetricEvents,
  );
  const mockSetConfirmationMetric = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    useConfirmationMetricEventsMock.mockReturnValue({
      setConfirmationMetric: mockSetConfirmationMetric,
    } as never);

    jest.mocked(useTransactionPayToken).mockReturnValue({
      payToken: {
        address: ADDRESS_MOCK,
        balanceHuman: '0',
        balanceFiat: '$0',
        balanceRaw: '0',
        balanceUsd: '0',
        chainId: CHAIN_ID_MOCK,
        decimals: 4,
        symbol: 'test',
      },
      setPayToken: jest.fn(),
    });

    jest.mocked(useNavigation).mockReturnValue({
      navigate: navigateMock,
    } as never);

    isHardwareAccountMock.mockReturnValue(false);
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
      { hideNetworkFilter: undefined },
    );
  });

  it('renders skeleton when no pay token selected', () => {
    jest.mocked(useTransactionPayToken).mockReturnValue({
      payToken: undefined,
      setPayToken: jest.fn(),
    });

    const { getByTestId } = render();

    expect(getByTestId('pay-with-row-skeleton')).toBeDefined();
  });

  it('disables edit if hardware wallet', async () => {
    isHardwareAccountMock.mockReturnValue(true);

    const { getByText } = render();

    await act(() => {
      fireEvent.press(getByText(`${ADDRESS_MOCK} ${CHAIN_ID_MOCK}`));
    });

    expect(navigateMock).not.toHaveBeenCalled();
  });

  describe('metrics', () => {
    it('sets mm_pay_token_list_opened when pay with row pressed', async () => {
      const { getByText } = render();

      await act(() => {
        fireEvent.press(getByText(`${ADDRESS_MOCK} ${CHAIN_ID_MOCK}`));
      });

      expect(mockSetConfirmationMetric).toHaveBeenCalledWith({
        properties: {
          mm_pay_token_list_opened: true,
        },
      });
    });
  });
});
