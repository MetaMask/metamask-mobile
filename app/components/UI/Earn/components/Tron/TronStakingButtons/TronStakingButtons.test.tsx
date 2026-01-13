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
      balanceButtonsContainer: {},
      balanceActionButton: {},
      ctaContent: {},
      ctaTitle: {},
      ctaText: {},
      buttonsRow: {},
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
      'stake.stake_your_trx_cta.title': 'Stake your TRX',
      'stake.stake_your_trx_cta.description_start': 'Earn up to ',
      'stake.stake_your_trx_cta.description_end': ' annually',
      'stake.stake_your_trx_cta.earn_button': 'Stake',
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

  it('navigates to stake screen with base asset TRX when not staked and uses default hasStakedPositions', () => {
    const { getByTestId, getByText } = render(
      <TronStakingButtons asset={baseAsset} showUnstake={false} />,
    );

    expect(getByText('Stake')).toBeOnTheScreen();

    fireEvent.press(getByTestId('stake-more-button'));

    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: { token: baseAsset },
    });
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('navigates to stake with synthesized TRX when asset is staked TRX without nativeAsset', () => {
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

    const { getByTestId } = render(
      <TronStakingButtons asset={stakedTrx} hasStakedPositions />,
    );
    fireEvent.press(getByTestId('stake-more-button'));

    expect(mockNavigate).toHaveBeenCalled();
    const call = mockNavigate.mock.calls.find((c) => c[0] === 'StakeScreens');
    expect(call?.[1]?.screen).toBe(Routes.STAKING.STAKE);
    const tokenArg = call?.[1]?.params?.token;
    expect(tokenArg.symbol).toBe('TRX');
    expect(tokenArg.ticker).toBe('TRX');
    expect(tokenArg.isStaked).toBe(false);
  });

  it('shows Unstake button when showUnstake is true and navigates on press', () => {
    const { getByTestId } = render(
      <TronStakingButtons asset={baseAsset} showUnstake hasStakedPositions />,
    );

    fireEvent.press(getByTestId('unstake-button'));

    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      screen: Routes.STAKING.UNSTAKE,
      params: { token: baseAsset },
    });
  });

  it('does not render stake button when user is not eligible', () => {
    mockUseStakingEligibility.mockReturnValue({
      isEligible: false,
      isLoadingEligibility: false,
      error: null,
      refreshPooledStakingEligibility: jest.fn(),
    });

    const { queryByTestId } = render(<TronStakingButtons asset={baseAsset} />);

    expect(queryByTestId('stake-more-button')).toBeNull();
  });

  it('renders unstake button when user is not eligible and has active staked position', () => {
    mockUseStakingEligibility.mockReturnValue({
      isEligible: false,
      isLoadingEligibility: false,
      error: null,
      refreshPooledStakingEligibility: jest.fn(),
    });

    const { queryByTestId } = render(
      <TronStakingButtons asset={baseAsset} showUnstake hasStakedPositions />,
    );

    expect(queryByTestId('unstake-button')).toBeOnTheScreen();
  });

  describe('CTA section', () => {
    it('renders CTA title and description without aprText when hasStakedPositions is false', () => {
      const { getByText } = render(
        <TronStakingButtons asset={baseAsset} hasStakedPositions={false} />,
      );

      expect(getByText('Stake your TRX')).toBeOnTheScreen();
      expect(getByText(/Earn up to/)).toBeOnTheScreen();
      expect(getByText(/annually/)).toBeOnTheScreen();
    });

    it('renders CTA with APR value when aprText is provided', () => {
      const { getByText } = render(
        <TronStakingButtons
          asset={baseAsset}
          hasStakedPositions={false}
          aprText="4.5%"
        />,
      );

      expect(getByText('Stake your TRX')).toBeOnTheScreen();
      expect(getByText('4.5%')).toBeOnTheScreen();
    });

    it('does not render CTA section when hasStakedPositions is true', () => {
      const { queryByText } = render(
        <TronStakingButtons
          asset={baseAsset}
          hasStakedPositions
          aprText="4.5%"
        />,
      );

      expect(queryByText('Stake your TRX')).toBeNull();
    });

    it('does not render CTA section when user is not eligible', () => {
      mockUseStakingEligibility.mockReturnValue({
        isEligible: false,
        isLoadingEligibility: false,
        error: null,
        refreshPooledStakingEligibility: jest.fn(),
      });

      const { queryByText } = render(
        <TronStakingButtons asset={baseAsset} hasStakedPositions={false} />,
      );

      expect(queryByText('Stake your TRX')).toBeNull();
    });
  });

  it('renders nothing when user is not eligible and has no active positions', () => {
    mockUseStakingEligibility.mockReturnValue({
      isEligible: false,
      isLoadingEligibility: false,
      error: null,
      refreshPooledStakingEligibility: jest.fn(),
    });

    const { toJSON } = render(
      <TronStakingButtons asset={baseAsset} hasStakedPositions={false} />,
    );

    expect(toJSON()).toBeNull();
  });
});
