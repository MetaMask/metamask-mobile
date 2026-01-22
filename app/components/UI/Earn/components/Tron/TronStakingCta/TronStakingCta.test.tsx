import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import TronStakingCta from './TronStakingCta';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenI } from '../../../../Tokens/types';
import useStakingEligibility from '../../../../Stake/hooks/useStakingEligibility';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../../selectors/assets/assets-list', () => ({
  selectAsset: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      ctaContent: {},
      ctaText: {},
      stakeButton: {},
    },
  }),
}));

jest.mock('../../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: { section: '#f0f0f0' },
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
  },
}));

jest.mock('../../../../Stake/hooks/useStakingEligibility', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'stake.stake_your_trx_cta.description_start': 'Stake your TRX and earn ',
      'stake.stake_your_trx_cta.description_end': ' annually.',
      'stake.stake_your_trx_cta.stake_button': 'Stake',
    };
    return map[key] ?? key;
  },
}));

const mockUseStakingEligibility = useStakingEligibility as jest.MockedFunction<
  typeof useStakingEligibility
>;

describe('TronStakingCta', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockImplementation(() => undefined);

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

  it('renders CTA message and Stake button when eligible', () => {
    const { getByText, getByTestId } = render(
      <TronStakingCta asset={baseAsset} />,
    );

    expect(getByText(/Stake your TRX and earn/)).toBeOnTheScreen();
    expect(getByText(/annually/)).toBeOnTheScreen();
    expect(getByText('Stake')).toBeOnTheScreen();
    expect(getByTestId('stake-button')).toBeOnTheScreen();
  });

  it('renders APR text when aprText is provided', () => {
    const { getByText } = render(
      <TronStakingCta asset={baseAsset} aprText="4.5%" />,
    );

    expect(getByText('4.5%')).toBeOnTheScreen();
  });

  it('navigates to stake screen when pressing Stake button', () => {
    const { getByTestId } = render(<TronStakingCta asset={baseAsset} />);

    fireEvent.press(getByTestId('stake-button'));

    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: { token: baseAsset },
    });
  });

  it('tracks analytics when pressing Stake button', () => {
    const { getByTestId } = render(<TronStakingCta asset={baseAsset} />);

    fireEvent.press(getByTestId('stake-button'));

    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('returns null when user is not eligible', () => {
    mockUseStakingEligibility.mockReturnValue({
      isEligible: false,
      isLoadingEligibility: false,
      error: null,
      refreshPooledStakingEligibility: jest.fn(),
    });

    const { toJSON } = render(<TronStakingCta asset={baseAsset} />);

    expect(toJSON()).toBeNull();
  });
});
