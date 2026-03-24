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
        availableBalance: '$1,232.39',
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
      getByText(`${strings('confirm.available_perps_balance')}$1,232.39`),
    ).toBeOnTheScreen();
  });

  it('renders a zero balance when the live account has no available balance', () => {
    mockUsePerpsLiveAccount.mockReturnValue({
      account: null,
      isInitialLoading: false,
    } as never);

    const { getByText } = renderComponent();

    expect(
      getByText(`${strings('confirm.available_perps_balance')}$0`),
    ).toBeOnTheScreen();
  });
});
