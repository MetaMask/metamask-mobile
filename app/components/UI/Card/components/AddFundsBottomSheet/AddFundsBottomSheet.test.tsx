import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import AddFundsBottomSheet from './AddFundsBottomSheet';
import { useOpenSwaps } from '../../hooks/useOpenSwaps';
import useDepositEnabled from '../../../Ramp/Deposit/hooks/useDepositEnabled';
import { isSwapsAllowed } from '../../../Swaps/utils';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { getDecimalChainId } from '../../../../../util/networks';
import { trace, TraceName } from '../../../../../util/trace';
import { CardTokenAllowance, AllowanceState } from '../../types';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { useRampNavigation } from '../../../Ramp/hooks/useRampNavigation';
import { CardHomeSelectors } from '../../../../../../e2e/selectors/Card/CardHome.selectors';
import { RampsButtonClickData } from '../../../Ramp/hooks/useRampsButtonClickData';

// Mock hooks first - must be hoisted before imports
const mockUseParams = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockGoToDeposit = jest.fn();

// Mock dependencies
jest.mock('../../../Ramp/hooks/useRampNavigation');
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
  mockTheme: {
    colors: {
      background: {
        default: '#ffffff',
      },
      text: {
        default: '#000000',
        alternative: '#666666',
      },
    },
    themeAppearance: 'light',
  },
}));

jest.mock('./AddFundsBottomSheet.styles', () => ({
  createStyles: jest.fn(() => ({
    iconContainer: {},
  })),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => mockUseParams(),
  createNavigationDetails: jest.fn((stackId, screenName) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (params?: any) => [stackId, { screen: screenName, params }],
  ),
}));

const mockButtonClickData: RampsButtonClickData = {
  ramp_routing: undefined,
  is_authenticated: false,
  preferred_provider: undefined,
  order_count: 0,
};

jest.mock('../../../Ramp/hooks/useRampsButtonClickData', () => ({
  useRampsButtonClickData: jest.fn(() => mockButtonClickData),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
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
  const mockOpenSwaps = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();
  const mockEventBuilder = {
    addProperties: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({ event: 'built' }),
  };

  const mockPriorityToken: CardTokenAllowance = {
    address: '0x456',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
    caipChainId: 'eip155:59144',
    allowanceState: AllowanceState.Enabled,
    allowance: '1000000',
  };

  const setupComponent = (
    priorityToken: CardTokenAllowance | undefined = mockPriorityToken,
  ) => {
    mockUseParams.mockReturnValue({
      priorityToken,
    });

    return renderWithProvider(() => <AddFundsBottomSheet />);
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useOpenSwaps as jest.Mock).mockReturnValue({
      openSwaps: mockOpenSwaps,
    });

    (useRampNavigation as jest.Mock).mockReturnValue({
      goToDeposit: mockGoToDeposit,
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
    const { toJSON } = setupComponent();

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with only swap option when deposit is disabled and matches snapshot', () => {
    (useDepositEnabled as jest.Mock).mockReturnValue({
      isDepositEnabled: false,
    });

    const { toJSON } = setupComponent();

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with only deposit option when swaps are not allowed and matches snapshot', () => {
    (isSwapsAllowed as jest.Mock).mockReturnValue(false);

    const { toJSON } = setupComponent();

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with no options when both are disabled and matches snapshot', () => {
    (useDepositEnabled as jest.Mock).mockReturnValue({
      isDepositEnabled: false,
    });
    (isSwapsAllowed as jest.Mock).mockReturnValue(false);

    const { toJSON } = setupComponent();

    expect(toJSON()).toMatchSnapshot();
  });

  it('displays the correct header text', () => {
    const { getByText } = setupComponent();

    expect(getByText('Select method')).toBeTruthy();
  });

  it('displays correct options when both are enabled', () => {
    const { getByText } = setupComponent();

    expect(getByText('Fund with cash')).toBeTruthy();
    expect(getByText('Fund with crypto')).toBeTruthy();
    expect(getByText('Low-cost card or bank transfer')).toBeTruthy();
    expect(getByText('Swap tokens into USDC on Linea')).toBeTruthy();
  });

  it('handles deposit option press correctly', () => {
    const { getByText } = setupComponent();

    fireEvent.press(getByText('Fund with cash'));

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_ADD_FUNDS_DEPOSIT_CLICKED,
    );
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.RAMPS_BUTTON_CLICKED,
    );
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Deposit',
        location: 'CardHome',
        chain_id_destination: '59144',
        ramp_type: 'DEPOSIT',
        ramp_routing: undefined,
        is_authenticated: false,
        preferred_provider: undefined,
        order_count: 0,
      }),
    );
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(trace).toHaveBeenCalledWith({
      name: TraceName.LoadDepositExperience,
    });
  });

  it('handles swap option press correctly', () => {
    const { getByText } = setupComponent();

    fireEvent.press(getByText('Fund with crypto'));

    expect(mockOpenSwaps).toHaveBeenCalledWith({
      beforeNavigate: expect.any(Function),
    });
  });

  it('does not render swap option when priority token is null', () => {
    (isSwapsAllowed as jest.Mock).mockReturnValue(false);
    const { queryByTestId } = setupComponent(undefined);

    const swapOption = queryByTestId(
      CardHomeSelectors.ADD_FUNDS_BOTTOM_SHEET_SWAP_OPTION,
    );

    expect(swapOption).toBeNull();
  });

  it('renders correct descriptions for different tokens', () => {
    const usdtToken = {
      ...mockPriorityToken,
      symbol: 'USDT',
    };

    const { getByText } = setupComponent(usdtToken);

    expect(getByText('Low-cost card or bank transfer')).toBeTruthy();
    expect(getByText('Swap tokens into USDT on Linea')).toBeTruthy();
  });

  it('renders both options for USDT token', () => {
    const usdtToken = {
      ...mockPriorityToken,
      symbol: 'USDT',
      name: 'Tether USD',
    };

    const { getByText } = setupComponent(usdtToken);

    expect(getByText('Fund with cash')).toBeTruthy();
    expect(getByText('Fund with crypto')).toBeTruthy();
  });

  it('renders both options for USDC token', () => {
    const { getByText } = setupComponent();

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

    const { getByText } = setupComponent(ethToken);

    expect(getByText('Fund with cash')).toBeTruthy();
    expect(getByText('Fund with crypto')).toBeTruthy();
    expect(getByText('Low-cost card or bank transfer')).toBeTruthy();
    expect(getByText('Swap tokens into ETH on Linea')).toBeTruthy();
  });

  it('navigates to deposit route when deposit callback is executed', () => {
    const { getByText } = setupComponent();

    fireEvent.press(getByText('Fund with cash'));

    expect(mockGoToDeposit).toHaveBeenCalled();
  });

  it('renders component correctly', () => {
    const { toJSON } = setupComponent();

    expect(toJSON()).toBeTruthy();
  });
});
