import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import TronStakingButtons from './TronStakingButtons';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenI } from '../../../../Tokens/types';
import { selectAsset } from '../../../../../../selectors/assets/assets-list';
import useStakingEligibility from '../../../../Stake/hooks/useStakingEligibility';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../../selectors/assets/assets-list', () => ({
  selectAsset: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSelectAsset = selectAsset as jest.MockedFunction<typeof selectAsset>;

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      buttonsContainer: {},
      balanceActionButton: {},
    },
  }),
}));

const mockTrackEvent = jest.fn();
const mockBuilderAddProps = jest.fn().mockReturnThis();
const mockBuilderBuild = jest.fn().mockReturnValue({});

jest.mock('../../../../../hooks/useMetrics', () => ({
  MetaMetricsEvents: {
    STAKE_BUTTON_CLICKED: 'STAKE_BUTTON_CLICKED',
  },
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: () => ({
      addProperties: mockBuilderAddProps,
      build: mockBuilderBuild,
    }),
  }),
}));

jest.mock('../../../../../../util/trace', () => ({
  trace: jest.fn(),
  TraceName: {
    EarnDepositScreen: 'EarnDepositScreen',
    EarnWithdrawScreen: 'EarnWithdrawScreen',
  },
}));

jest.mock('../../../../Stake/hooks/useStakingEligibility', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'stake.stake_more': 'Stake more',
      'stake.unstake': 'Unstake',
    };
    return map[key] ?? key;
  },
}));

const mockUseStakingEligibility = useStakingEligibility as jest.MockedFunction<
  typeof useStakingEligibility
>;

describe('TronStakingButtons', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockImplementation(() => undefined);
    mockSelectAsset.mockReset();

    mockUseStakingEligibility.mockReturnValue({
      isEligible: true,
      isLoadingEligibility: false,
      error: null,
      refreshPooledStakingEligibility: jest.fn(),
    });
  });

  const stakedAsset = {
    address: '0xtron',
    chainId: 'tron:111',
    symbol: 'sTRX',
    ticker: 'sTRX',
    name: 'Staked TRX',
    isStaked: true,
  } as TokenI;

  it('renders both Unstake and Stake more buttons when eligible', () => {
    const { getByTestId, getByText } = render(
      <TronStakingButtons asset={stakedAsset} />,
    );

    expect(getByText('Unstake')).toBeOnTheScreen();
    expect(getByText('Stake more')).toBeOnTheScreen();
    expect(getByTestId('unstake-button')).toBeOnTheScreen();
    expect(getByTestId('stake-more-button')).toBeOnTheScreen();
  });

  it('navigates to stake screen with base TRX when pressing Stake more', () => {
    const baseAsset = {
      address: '0xtron',
      chainId: 'tron:111',
      symbol: 'TRX',
      ticker: 'TRX',
      name: 'Tron',
      isStaked: false,
    } as TokenI;

    mockSelectAsset.mockReturnValue(baseAsset);

    mockUseSelector.mockImplementation((selector) =>
      selector({} as unknown as ReturnType<typeof Object>),
    );

    const { getByTestId } = render(<TronStakingButtons asset={stakedAsset} />);
    fireEvent.press(getByTestId('stake-more-button'));

    expect(mockNavigate).toHaveBeenCalled();
    const call = mockNavigate.mock.calls.find((c) => c[0] === 'StakeScreens');
    expect(call?.[1]?.screen).toBe(Routes.STAKING.STAKE);
    const tokenArg = call?.[1]?.params?.token;
    expect(tokenArg.symbol).toBe('TRX');
    expect(tokenArg.isStaked).toBe(false);
  });

  it('navigates to unstake screen when pressing Unstake', () => {
    const { getByTestId } = render(<TronStakingButtons asset={stakedAsset} />);

    fireEvent.press(getByTestId('unstake-button'));

    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      screen: Routes.STAKING.UNSTAKE,
      params: { token: stakedAsset },
    });
  });

  it('does not render Stake more button when user is not eligible', () => {
    mockUseStakingEligibility.mockReturnValue({
      isEligible: false,
      isLoadingEligibility: false,
      error: null,
      refreshPooledStakingEligibility: jest.fn(),
    });

    const { queryByTestId, getByTestId } = render(
      <TronStakingButtons asset={stakedAsset} />,
    );

    expect(queryByTestId('stake-more-button')).toBeNull();
    expect(getByTestId('unstake-button')).toBeOnTheScreen();
  });

  it('tracks analytics when pressing Stake more', () => {
    const { getByTestId } = render(<TronStakingButtons asset={stakedAsset} />);

    fireEvent.press(getByTestId('stake-more-button'));

    expect(mockTrackEvent).toHaveBeenCalled();
  });
});
