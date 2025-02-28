import React from 'react';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import AccountNetworkInfoExpanded from './AccountNetworkInfoExpanded';
import { useMultichainBalances } from '../../../../../../hooks/useMultichainBalances';

jest.mock('../../../../../../../core/Engine', () => ({
  getTotalFiatAccountBalance: () => ({ tokenFiat: 10 }),
}));

jest.mock('../../../../../../hooks/useMultichainBalances', () => ({
  useMultichainBalances: jest.fn(),
}));

const mockedUseMultichainBalances = useMultichainBalances as jest.Mock;

describe('AccountNetworkInfoExpanded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should match snapshot when isPortfolioVieEnabled is true', () => {
    mockedUseMultichainBalances.mockReturnValue({
      multichainBalances: {
        isPortfolioVieEnabled: true,
        displayBalance: '$100',
      },
    });
    const { toJSON } = renderWithProvider(<AccountNetworkInfoExpanded />, {
      state: personalSignatureConfirmationState,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly when isPortfolioVieEnabled is true', async () => {
    mockedUseMultichainBalances.mockReturnValue({
      multichainBalances: {
        isPortfolioVieEnabled: true,
        displayBalance: '$100',
      },
    });
    const { getByText } = renderWithProvider(<AccountNetworkInfoExpanded />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('Account')).toBeDefined();
    expect(getByText('Balance')).toBeDefined();
    expect(getByText('$100')).toBeDefined();
    expect(getByText('Network')).toBeDefined();
    expect(getByText('Ethereum Mainnet')).toBeDefined();
  });

  it('should render correctly when isPortfolioVieEnabled is false', async () => {
    mockedUseMultichainBalances.mockReturnValue({
      multichainBalances: {
        isPortfolioVieEnabled: false,
        displayBalance: '$100',
      },
    });
    const { queryByText, getByText } = renderWithProvider(
      <AccountNetworkInfoExpanded />,
      {
        state: personalSignatureConfirmationState,
      },
    );
    // Depending on your component's behavior when the portfolio view is disabled,
    // adjust the assertion accordingly. Here we assume '$100' is not rendered.
    expect(queryByText('$100')).toBeNull();
    // The rest of the UI should still render.
    expect(getByText('Account')).toBeDefined();
    expect(getByText('Balance')).toBeDefined();
    expect(getByText('Network')).toBeDefined();
    expect(getByText('Ethereum Mainnet')).toBeDefined();
  });
});
