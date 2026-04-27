import React from 'react';
import { render } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import { usePerpsLiveAccount } from '../../../../../UI/Perps/hooks/stream/usePerpsLiveAccount';
import { PerpsWithdrawBalance } from './perps-withdraw-balance';

jest.mock('../../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(),
}));
jest.mock('../../../../../UI/Perps/hooks/stream/usePerpsLiveAccount');

const mockUseStyles = jest.mocked(useStyles);
const mockUsePerpsLiveAccount = jest.mocked(usePerpsLiveAccount);

function renderComponent() {
  return render(<PerpsWithdrawBalance />);
}

describe('PerpsWithdrawBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseStyles.mockReturnValue({
      styles: {
        container: {},
      },
    } as never);
    mockUsePerpsLiveAccount.mockReturnValue({
      account: {
        spendableBalance: '$1,232.39',
        withdrawableBalance: '$1,232.39',
      },
      isInitialLoading: false,
    } as never);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders the formatted Perps balance', () => {
    const { getByText } = renderComponent();

    expect(
      getByText(`${strings('confirm.available_balance')}$1,232.39`),
    ).toBeOnTheScreen();
  });

  it('truncates 3+ decimal balances down to 2 decimals so the displayed value matches the Max button', () => {
    // Without truncation, Intl.NumberFormat rounds half-up and would show
    // $50.39 for an underlying 50.389 balance, one cent higher than the
    // Max button computed via BigNumber.ROUND_DOWN.
    mockUsePerpsLiveAccount.mockReturnValue({
      account: { availableBalance: '50.389' },
      isInitialLoading: false,
    } as never);

    const { getByText } = renderComponent();

    expect(
      getByText(`${strings('confirm.available_balance')}$50.38`),
    ).toBeOnTheScreen();
  });

  it('renders a zero balance when the live account has no available balance', () => {
    mockUsePerpsLiveAccount.mockReturnValue({
      account: null,
      isInitialLoading: false,
    } as never);

    const { getByText } = renderComponent();

    expect(
      getByText(`${strings('confirm.available_balance')}$0`),
    ).toBeOnTheScreen();
  });
});
