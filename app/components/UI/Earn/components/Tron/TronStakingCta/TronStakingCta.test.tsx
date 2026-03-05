import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TronStakingCta from './TronStakingCta';
import { TronStakingCtaTestIds } from './TronStakingCta.testIds';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenI } from '../../../../Tokens/types';

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
      ctaTitle: {},
      ctaText: {},
      earnButton: {},
    },
  }),
}));

const mockTrackEvent = jest.fn();

jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: () => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    }),
  }),
}));

jest.mock('../../../../../../util/trace', () => ({
  trace: jest.fn(),
  TraceName: { EarnDepositScreen: 'EarnDepositScreen' },
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'stake.stake_your_trx_cta.title': 'Stake your TRX',
      'stake.stake_your_trx_cta.description_start': 'Earn up to ',
      'stake.stake_your_trx_cta.description_end': ' annually',
      'stake.stake_your_trx_cta.earn_button': 'Earn',
    };
    return map[key] ?? key;
  },
}));

describe('TronStakingCta', () => {
  const asset = {
    address: '0xtron',
    chainId: 'tron:111',
    symbol: 'TRX',
    ticker: 'TRX',
  } as TokenI;

  beforeEach(() => jest.clearAllMocks());

  it('renders CTA title and description', () => {
    const { getByText } = render(
      <TronStakingCta asset={asset} />,
    );

    expect(getByText('Stake your TRX')).toBeOnTheScreen();
    expect(getByText(/Earn up to/)).toBeOnTheScreen();
    expect(getByText(/annually/)).toBeOnTheScreen();
  });

  it('renders APR text when provided', () => {
    const { getByText } = render(
      <TronStakingCta asset={asset} aprText="4.5%" />,
    );

    expect(getByText('4.5%')).toBeOnTheScreen();
  });

  it('navigates to stake screen on Earn button press', () => {
    const { getByTestId } = render(
      <TronStakingCta asset={asset} />,
    );

    fireEvent.press(getByTestId(TronStakingCtaTestIds.EARN_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: { token: asset },
    });
  });
});
