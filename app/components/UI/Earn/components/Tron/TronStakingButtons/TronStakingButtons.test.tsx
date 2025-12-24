import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import TronStakingButtons from './TronStakingButtons';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenI } from '../../../../Tokens/types';
import { selectAsset } from '../../../../../../selectors/assets/assets-list';

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

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('TronStakingButtons', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockImplementation(() => undefined);
    mockSelectAsset.mockReset();
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

    expect(getByText('stake.stake_your_trx_cta.earn_button')).toBeOnTheScreen();

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
});
