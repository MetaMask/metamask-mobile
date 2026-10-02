import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import {
  TokenDetailsV1,
  TOKEN_DETAILS_V1_TEST_ID,
  TOKEN_DETAILS_V1_BACK_BUTTON_TEST_ID,
} from './TokenDetailsV1';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { SecuritySocialSectionSelectors } from '../components/V1/SecuritySocialSection/SecuritySocialSection.testIds';
import { SecurityPillSelectors } from '../components/V1/SecurityPill/SecurityPill.testIds';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

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
    const { getByTestId } = render(<TokenDetailsV1 token={baseToken} />);

    expect(getByTestId(TOKEN_DETAILS_V1_TEST_ID)).toBeOnTheScreen();
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = render(<TokenDetailsV1 token={baseToken} />);

    fireEvent.press(getByTestId(TOKEN_DETAILS_V1_BACK_BUTTON_TEST_ID));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders the security & social row with the mocked security verdict', () => {
    const { getByTestId } = render(<TokenDetailsV1 token={baseToken} />);

    expect(
      getByTestId(SecuritySocialSectionSelectors.SECTION),
    ).toBeOnTheScreen();
    // Asserted by test ID, not label, so previewing a different verdict via
    // MOCK_SECURITY_VERDICT does not fail this test. SecurityPill's own tests
    // cover the label for each verdict.
    expect(getByTestId(SecurityPillSelectors.VERDICT)).toBeOnTheScreen();
  });
});
