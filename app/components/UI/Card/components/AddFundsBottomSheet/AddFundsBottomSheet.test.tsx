import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { ethers } from 'ethers';
import AddFundsBottomSheet from './AddFundsBottomSheet';
import { useOpenSwaps } from '../../hooks/useOpenSwaps';
import useDepositEnabled from '../../../Ramp/Deposit/hooks/useDepositEnabled';
import { isSwapsAllowed } from '../../../Swaps/utils';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { getDecimalChainId } from '../../../../../util/networks';
import { trace, TraceName } from '../../../../../util/trace';
import Routes from '../../../../../constants/navigation/Routes';
import { CardTokenAllowance, AllowanceState } from '../../types';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';

// Mock dependencies
jest.mock('../../hooks/useOpenSwaps', () => ({
  useOpenSwaps: jest.fn(),
}));

jest.mock('../../../Ramp/Deposit/hooks/useDepositEnabled', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../Swaps/utils', () => ({
  isSwapsAllowed: jest.fn(),
}));

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
  MetaMetricsEvents: {
    CARD_ADD_FUNDS_DEPOSIT_CLICKED: 'card_add_funds_deposit_clicked',
    RAMPS_BUTTON_CLICKED: 'ramps_button_clicked',
  },
}));

jest.mock('../../../../../util/networks', () => ({
  getDecimalChainId: jest.fn(),
}));

jest.mock('../../../../../util/trace', () => ({
  trace: jest.fn(),
  TraceName: {
    LoadDepositExperience: 'LoadDepositExperience',
  },
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      text: {
        alternative: '#666666',
      },
    },
  })),
}));

jest.mock('./AddFundsBottomSheet.styles', () => ({
  createStyles: jest.fn(() => ({
    iconContainer: {},
  })),
}));

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: 'AddFundsBottomSheet',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('AddFundsBottomSheet', () => {
  const mockNavigate = jest.fn();
  const mockOpenSwaps = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();
  const mockEventBuilder = {
    addProperties: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({ event: 'built' }),
  };
  const mockSetOpenAddFundsBottomSheet = jest.fn();

  const mockSheetRef = React.createRef<BottomSheetRef>();

  const mockPriorityToken: CardTokenAllowance = {
    address: '0x456',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
    chainId: '0xe708',
    allowanceState: AllowanceState.Enabled,
    allowance: ethers.BigNumber.from('1000000'), // 1 USDC
    isStaked: false,
  };

  const defaultProps = {
    setOpenAddFundsBottomSheet: mockSetOpenAddFundsBottomSheet,
    sheetRef: mockSheetRef,
    priorityToken: mockPriorityToken,
    chainId: '0xe708',
    navigate: mockNavigate,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useOpenSwaps as jest.Mock).mockReturnValue({
      openSwaps: mockOpenSwaps,
    });

    (useDepositEnabled as jest.Mock).mockReturnValue({
      isDepositEnabled: true,
    });

    (isSwapsAllowed as jest.Mock).mockReturnValue(true);

    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });

    (getDecimalChainId as jest.Mock).mockReturnValue('59144');

    mockCreateEventBuilder.mockReturnValue(mockEventBuilder);
  });

  it('renders with both options enabled and matches snapshot', () => {
    const { toJSON } = renderWithProvider(() => (
      <AddFundsBottomSheet {...defaultProps} />
    ));
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with only swap option when deposit is disabled and matches snapshot', () => {
    (useDepositEnabled as jest.Mock).mockReturnValue({
      isDepositEnabled: false,
    });

    const { toJSON } = renderWithProvider(() => (
      <AddFundsBottomSheet {...defaultProps} />
    ));
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with only deposit option when swaps are not allowed and matches snapshot', () => {
    (isSwapsAllowed as jest.Mock).mockReturnValue(false);

    const { toJSON } = renderWithProvider(() => (
      <AddFundsBottomSheet {...defaultProps} />
    ));
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with no options when both are disabled and matches snapshot', () => {
    (useDepositEnabled as jest.Mock).mockReturnValue({
      isDepositEnabled: false,
    });
    (isSwapsAllowed as jest.Mock).mockReturnValue(false);

    const { toJSON } = renderWithProvider(() => (
      <AddFundsBottomSheet {...defaultProps} />
    ));
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays the correct header text', () => {
    const { getByText } = renderWithProvider(() => (
      <AddFundsBottomSheet {...defaultProps} />
    ));

    expect(getByText('Select method')).toBeTruthy();
  });

  it('displays correct options when both are enabled', () => {
    const { getByText } = renderWithProvider(() => (
      <AddFundsBottomSheet {...defaultProps} />
    ));

    expect(getByText('Fund with cash')).toBeTruthy();
    expect(getByText('Fund with crypto')).toBeTruthy();
    expect(getByText('Low-cost card or bank transfer')).toBeTruthy();
    expect(getByText('Swap tokens into USDC on Linea')).toBeTruthy();
  });

  it('handles deposit option press correctly', () => {
    const { getByText } = renderWithProvider(() => (
      <AddFundsBottomSheet {...defaultProps} />
    ));

    fireEvent.press(getByText('Fund with cash'));

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_ADD_FUNDS_DEPOSIT_CLICKED,
    );
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.RAMPS_BUTTON_CLICKED,
    );
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(trace).toHaveBeenCalledWith({
      name: TraceName.LoadDepositExperience,
    });
  });

  it('handles swap option press correctly', () => {
    const { getByText } = renderWithProvider(() => (
      <AddFundsBottomSheet {...defaultProps} />
    ));

    fireEvent.press(getByText('Fund with crypto'));

    expect(mockOpenSwaps).toHaveBeenCalledWith({
      chainId: '0xe708',
      beforeNavigate: expect.any(Function),
    });
  });

  it('does not call openSwaps when priority token is null', () => {
    const { getByText } = renderWithProvider(() => (
      <AddFundsBottomSheet {...defaultProps} priorityToken={undefined} />
    ));

    fireEvent.press(getByText('Fund with crypto'));

    expect(mockOpenSwaps).not.toHaveBeenCalled();
  });

  it('renders correct descriptions for different tokens', () => {
    const usdtToken = {
      ...mockPriorityToken,
      symbol: 'USDT',
    };

    const { getByText } = renderWithProvider(() => (
      <AddFundsBottomSheet {...defaultProps} priorityToken={usdtToken} />
    ));

    expect(getByText('Low-cost card or bank transfer')).toBeTruthy();
    expect(getByText('Swap tokens into USDT on Linea')).toBeTruthy();
  });

  it('renders both options for USDT token', () => {
    const usdtToken = {
      ...mockPriorityToken,
      symbol: 'USDT',
      name: 'Tether USD',
    };

    const { getByText } = renderWithProvider(() => (
      <AddFundsBottomSheet {...defaultProps} priorityToken={usdtToken} />
    ));

    expect(getByText('Fund with cash')).toBeTruthy();
    expect(getByText('Fund with crypto')).toBeTruthy();
  });

  it('renders both options for USDC token', () => {
    const { getByText } = renderWithProvider(() => (
      <AddFundsBottomSheet {...defaultProps} />
    ));

    expect(getByText('Fund with cash')).toBeTruthy();
    expect(getByText('Fund with crypto')).toBeTruthy();
  });

  it('renders both options for other tokens like ETH', () => {
    const ethToken = {
      ...mockPriorityToken,
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
    };

    const { getByText } = renderWithProvider(() => (
      <AddFundsBottomSheet {...defaultProps} priorityToken={ethToken} />
    ));

    expect(getByText('Fund with cash')).toBeTruthy();
    expect(getByText('Fund with crypto')).toBeTruthy();
    expect(getByText('Low-cost card or bank transfer')).toBeTruthy();
    expect(getByText('Swap tokens into ETH on Linea')).toBeTruthy();
  });

  it('navigates to deposit route when deposit callback is executed', () => {
    const { getByText } = renderWithProvider(() => (
      <AddFundsBottomSheet {...defaultProps} />
    ));

    fireEvent.press(getByText('Fund with cash'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.DEPOSIT.ID);
  });

  it('handles ref prop correctly', () => {
    const { toJSON } = renderWithProvider(() => (
      <AddFundsBottomSheet {...defaultProps} />
    ));

    expect(toJSON()).toBeTruthy();
  });
});
