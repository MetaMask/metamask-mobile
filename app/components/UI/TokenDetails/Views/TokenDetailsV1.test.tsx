import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import {
  TokenDetailsV1,
  TOKEN_DETAILS_V1_TEST_ID,
  TOKEN_DETAILS_V1_BACK_BUTTON_TEST_ID,
} from './TokenDetailsV1';
import {
  TokenDetailsVariant,
  type TokenDetailsRouteParams,
} from '../constants/constants';
import { SecuritySocialSectionSelectors } from '../components/V1/SecuritySocialSection/SecuritySocialSection.testIds';
import { SecurityPillSelectors } from '../components/V1/SecurityPill/SecurityPill.testIds';
import { StatBarSelectors } from '../components/V1/StatBar/StatBar.testIds';
import { TokenStatKey } from '../components/V1/StatBar/StatBar.types';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

// Keeps the security fetch off the network. Tokens carrying `securityData`
// from navigation short-circuit the hook before it reaches this.
jest.mock('@metamask/assets-controllers', () => ({
  fetchTokenAssets: jest.fn().mockResolvedValue([]),
}));

/** Minimal shape that satisfies the hook's prefetched-data validation. */
const securityDataWithLinks = {
  resultType: 'Benign',
  features: [],
  metadata: {
    externalLinks: {
      homepage: 'https://pepe.vip',
      twitterPage: 'pepecoineth',
      telegramChannelId: 'pepecoineth',
    },
  },
} as unknown as TokenDetailsRouteParams['securityData'];

const baseToken = {
  address: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
  chainId: '0x1',
  symbol: 'PEPE',
  name: 'Pepe',
  isETH: false,
  isNative: false,
  balanceError: null,
  image: '',
  logo: '',
  aggregators: [],
  decimals: 18,
} as unknown as TokenDetailsRouteParams;

describe('TokenDetailsV1', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
  });

  it('renders the page', () => {
    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(getByTestId(TOKEN_DETAILS_V1_TEST_ID)).toBeOnTheScreen();
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    fireEvent.press(getByTestId(TOKEN_DETAILS_V1_BACK_BUTTON_TEST_ID));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders the security & social row with the mocked security verdict', () => {
    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(
      getByTestId(SecuritySocialSectionSelectors.SECTION),
    ).toBeOnTheScreen();
    // Asserted by test ID, not label, so previewing a different verdict via
    // MOCK_SECURITY_VERDICT does not fail this test. SecurityPill's own tests
    // cover the label for each verdict.
    expect(getByTestId(SecurityPillSelectors.VERDICT)).toBeOnTheScreen();
  });

  it('renders the token social links from its security data', () => {
    const { getByTestId } = render(
      <TokenDetailsV1
        token={{ ...baseToken, securityData: securityDataWithLinks }}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(
      getByTestId(SecuritySocialSectionSelectors.LINK_X),
    ).toBeOnTheScreen();
    expect(
      getByTestId(SecuritySocialSectionSelectors.LINK_WEBSITE),
    ).toBeOnTheScreen();
    expect(
      getByTestId(SecuritySocialSectionSelectors.LINK_TELEGRAM),
    ).toBeOnTheScreen();
  });

  it('renders no social links for a token without security data', () => {
    const { queryByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(queryByTestId(SecuritySocialSectionSelectors.LINK_X)).toBeNull();
  });

  it('offers the contract address for copying', () => {
    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(
      getByTestId(SecuritySocialSectionSelectors.COPY_ADDRESS),
    ).toBeOnTheScreen();
  });

  // A native token's `address` is a placeholder, not something worth copying.
  it('hides the copy chip for a native token', () => {
    const { queryByTestId } = render(
      <TokenDetailsV1
        token={{ ...baseToken, isNative: true }}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(
      queryByTestId(SecuritySocialSectionSelectors.COPY_ADDRESS),
    ).toBeNull();
  });

  it('renders the stat bar for the variant it is given', () => {
    const { getByTestId } = render(
      <TokenDetailsV1
        token={baseToken}
        variant={TokenDetailsVariant.Memecoin}
      />,
    );

    expect(getByTestId(StatBarSelectors.BAR)).toBeOnTheScreen();
    expect(
      getByTestId(StatBarSelectors.cell(TokenStatKey.MarketCap)),
    ).toBeOnTheScreen();
  });
});
