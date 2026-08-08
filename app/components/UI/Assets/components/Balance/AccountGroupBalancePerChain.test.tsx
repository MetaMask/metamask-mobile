import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import AccountGroupBalancePerChain from './AccountGroupBalancePerChain';

jest.mock('../../../../../selectors/preferencesController', () => ({
  selectPrivacyMode: jest.fn(() => false),
}));

jest.mock('../../../../../selectors/assets/balances', () => ({
  selectBalanceBySelectedAccountGroup: jest.fn(() => () => null),
}));

const mockFormatCurrency = jest.fn((value: number, currency: string) =>
  currency.toUpperCase() === 'USD'
    ? `$${value.toFixed(2)}`
    : `${value.toFixed(2)} ${currency}`,
);

jest.mock('../../../../hooks/useFormatters', () => ({
  useFormatters: () => ({
    formatCurrency: mockFormatCurrency,
  }),
}));

const testState = {};

describe('AccountGroupBalancePerChain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { selectBalanceBySelectedAccountGroup } = jest.requireMock(
      '../../../../../selectors/assets/balances',
    );
    const { selectPrivacyMode } = jest.requireMock(
      '../../../../../selectors/preferencesController',
    );
    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => () => null,
    );
    (selectPrivacyMode as jest.Mock).mockReturnValue(false);
  });

  it('calls selectBalanceBySelectedAccountGroup with single-element array containing caipChainId', () => {
    const { selectBalanceBySelectedAccountGroup } = jest.requireMock(
      '../../../../../selectors/assets/balances',
    );
    const caipChainId = 'eip155:1';

    renderWithProvider(
      <AccountGroupBalancePerChain caipChainId={caipChainId} />,
      { state: testState },
    );

    expect(selectBalanceBySelectedAccountGroup).toHaveBeenCalledWith([
      caipChainId,
    ]);
  });

  it('renders formatted balance when selector returns balance data', () => {
    const balanceValue = {
      totalBalanceInUserCurrency: 1234.56,
      userCurrency: 'usd',
    };
    const { selectBalanceBySelectedAccountGroup } = jest.requireMock(
      '../../../../../selectors/assets/balances',
    );
    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => () => balanceValue,
    );

    const { getByText } = renderWithProvider(
      <AccountGroupBalancePerChain caipChainId="eip155:1" />,
      { state: testState },
    );

    expect(mockFormatCurrency).toHaveBeenCalledWith(1234.56, 'usd');
    expect(getByText('$1234.56')).toBeOnTheScreen();
  });

  it('renders zero balance when selector returns null', () => {
    const { selectBalanceBySelectedAccountGroup } = jest.requireMock(
      '../../../../../selectors/assets/balances',
    );
    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => () => null,
    );

    const { getByText } = renderWithProvider(
      <AccountGroupBalancePerChain caipChainId="eip155:137" />,
      { state: testState },
    );

    expect(mockFormatCurrency).toHaveBeenCalledWith(0, 'USD');
    expect(getByText('$0.00')).toBeOnTheScreen();
  });

  it('renders zero balance when selector returns zero totalBalanceInUserCurrency', () => {
    const balanceValue = {
      totalBalanceInUserCurrency: 0,
      userCurrency: 'EUR',
    };
    const { selectBalanceBySelectedAccountGroup } = jest.requireMock(
      '../../../../../selectors/assets/balances',
    );
    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => () => balanceValue,
    );

    const { getByText } = renderWithProvider(
      <AccountGroupBalancePerChain caipChainId="eip155:1" />,
      { state: testState },
    );

    expect(mockFormatCurrency).toHaveBeenCalledWith(0, 'EUR');
    expect(getByText('0.00 EUR')).toBeOnTheScreen();
  });

  it('uses privacy mode from selector', () => {
    const { selectPrivacyMode } = jest.requireMock(
      '../../../../../selectors/preferencesController',
    );
    (selectPrivacyMode as jest.Mock).mockReturnValue(true);

    renderWithProvider(<AccountGroupBalancePerChain caipChainId="eip155:1" />, {
      state: testState,
    });

    expect(selectPrivacyMode).toHaveBeenCalled();
  });
});
