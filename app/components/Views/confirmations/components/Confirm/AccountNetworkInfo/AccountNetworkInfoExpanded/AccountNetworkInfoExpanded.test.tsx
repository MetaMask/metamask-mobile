import React from 'react';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import AccountNetworkInfoExpanded from './AccountNetworkInfoExpanded';
import { isPortfolioViewEnabled } from '../../../../../../../util/networks';

jest.mock('../../../../../../../util/networks', () => ({
  ...jest.requireActual('../../../../../../../util/networks'),
  isPortfolioViewEnabled: jest.fn(),
}));

jest.mock('../../../../../../../core/Engine', () => ({
  getTotalFiatAccountBalance: () => ({ tokenFiat: 10 }),
}));

describe('AccountNetworkInfoExpanded', () => {
  const mockIsPortfolioViewEnabled = jest.mocked(isPortfolioViewEnabled);

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPortfolioViewEnabled.mockReturnValue(false);
  });

  it('should match snapshot when isPortfolioVieEnabled is true', () => {
    mockIsPortfolioViewEnabled.mockReturnValue(true);
    const { toJSON, getByText } = renderWithProvider(
      <AccountNetworkInfoExpanded />,
      {
        state: personalSignatureConfirmationState,
      },
    );

    expect(toJSON()).toMatchSnapshot();
    expect(getByText('Account')).toBeDefined();
    expect(getByText('Balance')).toBeDefined();
    expect(getByText('Balance')).toBeDefined();
    expect(getByText('$0')).toBeDefined();
    expect(getByText('Network')).toBeDefined();
    expect(getByText('Ethereum Mainnet')).toBeDefined();
  });

  it('should render correctly when isPortfolioVieEnabled is false', async () => {
    const { getByText } = renderWithProvider(<AccountNetworkInfoExpanded />, {
      state: personalSignatureConfirmationState,
    });

    expect(getByText('$10')).toBeDefined();
    expect(getByText('Account')).toBeDefined();
    expect(getByText('Balance')).toBeDefined();
    expect(getByText('Network')).toBeDefined();
    expect(getByText('Ethereum Mainnet')).toBeDefined();
  });
});
