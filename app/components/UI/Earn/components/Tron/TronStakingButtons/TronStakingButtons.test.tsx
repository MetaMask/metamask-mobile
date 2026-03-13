import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import TronStakingButtons from './TronStakingButtons';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenI } from '../../../../Tokens/types';
import { selectAsset } from '../../../../../../selectors/assets/assets-list';
import useStakingEligibility from '../../../../Stake/hooks/useStakingEligibility';
import { EVENT_LOCATIONS } from '../../../../Stake/constants/events';
import { TronStakingButtonsTestIds } from './TronStakingButtons.testIds';

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
      balanceButtonsContainer: {},
      balanceActionButton: {},
      buttonsRow: {},
    },
  }),
}));

const mockTrackEvent = jest.fn();
const mockBuilderAddProps = jest.fn().mockReturnThis();
const mockBuilderBuild = jest.fn().mockReturnValue({});

jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
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

  const baseAsset = {
    address: '0xtron',
    chainId: 'tron:111',
    symbol: 'TRX',
    ticker: 'TRX',
    name: 'Tron',
    isStaked: false,
  } as TokenI;

  it('renders both Unstake and Stake more buttons', () => {
    const { getByText } = render(<TronStakingButtons asset={baseAsset} />);

    expect(getByText('Unstake')).toBeOnTheScreen();
    expect(getByText('Stake more')).toBeOnTheScreen();
  });

  it('navigates to stake screen on Stake more press', () => {
    const { getByTestId } = render(<TronStakingButtons asset={baseAsset} />);

    fireEvent.press(getByTestId(TronStakingButtonsTestIds.STAKE_MORE_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: { token: baseAsset },
    });
    expect(mockTrackEvent).toHaveBeenCalledWith(
      mockBuilderBuild.mock.results[0]?.value,
    );
    expect(mockBuilderAddProps).toHaveBeenCalledWith({
      location: EVENT_LOCATIONS.HOME_SCREEN,
      text: 'Stake',
      token: 'TRX',
    });
  });

  it('navigates to unstake screen on Unstake press', () => {
    const { getByTestId } = render(<TronStakingButtons asset={baseAsset} />);

    fireEvent.press(getByTestId(TronStakingButtonsTestIds.UNSTAKE_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      screen: Routes.STAKING.UNSTAKE,
      params: { token: baseAsset },
    });
  });

  it('resolves base asset from selector when asset is staked TRX', () => {
    const stakedTrx = {
      ...baseAsset,
      symbol: 'sTRX',
      ticker: 'sTRX',
      isStaked: true,
      nativeAsset: undefined,
    } as TokenI;

    mockSelectAsset.mockReturnValue({
      ...baseAsset,
      isStaked: false,
    } as TokenI);

    mockUseSelector.mockImplementation((selector) =>
      selector({} as unknown as ReturnType<typeof Object>),
    );

    const { getByTestId } = render(<TronStakingButtons asset={stakedTrx} />);

    fireEvent.press(getByTestId(TronStakingButtonsTestIds.STAKE_MORE_BUTTON));

    const call = mockNavigate.mock.calls.find((c) => c[0] === 'StakeScreens');
    const tokenArg = call?.[1]?.params?.token;
    expect(tokenArg.symbol).toBe('TRX');
    expect(tokenArg.isStaked).toBe(false);
  });

  it('hides Stake more button when user is not eligible', () => {
    mockUseStakingEligibility.mockReturnValue({
      isEligible: false,
      isLoadingEligibility: false,
      error: null,
      refreshPooledStakingEligibility: jest.fn(),
    });

    const { queryByTestId, getByTestId } = render(
      <TronStakingButtons asset={baseAsset} />,
    );

    expect(
      queryByTestId(TronStakingButtonsTestIds.STAKE_MORE_BUTTON),
    ).toBeNull();
    expect(
      getByTestId(TronStakingButtonsTestIds.UNSTAKE_BUTTON),
    ).toBeOnTheScreen();
  });
});
