import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import { XlmScope } from '@metamask/keyring-api';
import { strings } from '../../../../../../../locales/i18n';
import { getIsAssetRequireActivate } from '../../../../../../selectors/stellar/stellar-assets';
import { TokenDetailsSource } from '../../../../TokenDetails/constants/constants';
import { createMockToken } from '../../../testUtils';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';
import { StellarTrustlineBanner } from './StellarTrustlineBanner';
import { createBannerState, renderBanner } from './testUtils';

const mockDispatch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    dispatch: mockDispatch,
  }),
}));

jest.mock('../../../../../../selectors/stellar/stellar-assets', () => ({
  ...jest.requireActual('../../../../../../selectors/stellar/stellar-assets'),
  getIsAssetRequireActivate: jest.fn(),
}));

const STELLAR_USDC_ADDRESS =
  'stellar:pubnet/asset:USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

const mockEthSource = createMockToken({
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  chainId: '0x1',
});

const mockStellarUsdc = createMockToken({
  address: STELLAR_USDC_ADDRESS,
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 7,
  chainId: XlmScope.Pubnet,
});

const mockStellarXlm = createMockToken({
  address: 'stellar:pubnet/slip44:148',
  symbol: 'XLM',
  name: 'Lumens',
  decimals: 7,
  chainId: XlmScope.Pubnet,
});

describe('StellarTrustlineBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getIsAssetRequireActivate).mockImplementation(
      (_state, { assetId }) =>
        // Mirror real selector: only classic Stellar assets can require activation.
        typeof assetId === 'string' &&
        assetId.startsWith('stellar:pubnet/asset:'),
    );
  });

  it('shows a warning banner for cross-chain Stellar destinations that need a trustline', () => {
    const { getByTestId, getByText } = renderBanner(
      <StellarTrustlineBanner />,
      {
        state: createBannerState({
          sourceToken: mockEthSource,
          destToken: mockStellarUsdc,
        }),
      },
    );

    expect(
      getByTestId(SwapsBannersSelectorsIDs.STELLAR_TRUSTLINE),
    ).toBeTruthy();
    expect(
      getByText(
        strings('bridge.stellar_trustline_warning_title', { token: 'USDC' }),
      ),
    ).toBeTruthy();
    expect(
      getByText(
        strings('bridge.stellar_trustline_warning_message', { token: 'USDC' }),
      ),
    ).toBeTruthy();
  });

  it('navigates to Asset details when the activate CTA is pressed', () => {
    const { getByText } = renderBanner(<StellarTrustlineBanner />, {
      state: createBannerState({
        sourceToken: mockEthSource,
        destToken: mockStellarUsdc,
      }),
    });

    fireEvent.press(
      getByText(
        strings('bridge.stellar_trustline_warning_cta', { token: 'USDC' }),
      ),
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.push('Asset', {
        ...mockStellarUsdc,
        source: TokenDetailsSource.Swap,
      }),
    );
  });

  it('renders nothing when the destination asset does not require activation', () => {
    jest.mocked(getIsAssetRequireActivate).mockReturnValue(false);

    const { queryByTestId } = renderBanner(<StellarTrustlineBanner />, {
      state: createBannerState({
        sourceToken: mockEthSource,
        destToken: mockStellarUsdc,
      }),
    });

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.STELLAR_TRUSTLINE),
    ).toBeNull();
  });

  it('renders nothing for same-chain Stellar swaps', () => {
    const { queryByTestId } = renderBanner(<StellarTrustlineBanner />, {
      state: createBannerState({
        sourceToken: mockStellarXlm,
        destToken: mockStellarUsdc,
      }),
    });

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.STELLAR_TRUSTLINE),
    ).toBeNull();
  });

  it('renders nothing for non-Stellar destinations', () => {
    const { queryByTestId } = renderBanner(<StellarTrustlineBanner />, {
      state: createBannerState({
        sourceToken: mockEthSource,
        destToken: createMockToken({
          address: '0xabc',
          symbol: 'USDC',
          chainId: '0xa',
        }),
      }),
    });

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.STELLAR_TRUSTLINE),
    ).toBeNull();
  });
});
