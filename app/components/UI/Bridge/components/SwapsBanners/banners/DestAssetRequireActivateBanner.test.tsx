import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import { XlmScope } from '@metamask/keyring-api';
import { strings } from '../../../../../../../locales/i18n';
import { TokenDetailsSource } from '../../../../TokenDetails/constants/constants';
import { useDestAssetRequireActivate } from '../../../hooks/useDestAssetRequireActivate';
import { useRecipientDisplayData } from '../../../hooks/useRecipientDisplayData/useRecipientDisplayData';
import { createMockToken } from '../../../testUtils';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';
import { DestAssetRequireActivateBanner } from './DestAssetRequireActivateBanner';
import { createBannerState, renderBanner } from './testUtils';

const mockDispatch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    dispatch: mockDispatch,
  }),
}));

jest.mock('../../../hooks/useDestAssetRequireActivate', () => ({
  useDestAssetRequireActivate: jest.fn(),
}));

jest.mock(
  '../../../hooks/useRecipientDisplayData/useRecipientDisplayData',
  () => ({
    useRecipientDisplayData: jest.fn(),
  }),
);

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

describe('DestAssetRequireActivateBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useDestAssetRequireActivate).mockReturnValue({
      isDestAssetRequireActivate: true,
      isDestSameAsActiveAccount: true,
    });
    jest.mocked(useRecipientDisplayData).mockReturnValue({
      destinationDisplayName: 'Account 1',
      destinationWalletName: undefined,
      destinationAccountAddress: 'GDEST',
    });
  });

  it('shows a warning banner with Activate CTA when dest is the active account', () => {
    const { getByTestId, getByText } = renderBanner(
      <DestAssetRequireActivateBanner />,
      {
        state: createBannerState({
          sourceToken: mockEthSource,
          destToken: mockStellarUsdc,
        }),
      },
    );

    expect(
      getByTestId(SwapsBannersSelectorsIDs.DEST_ASSET_REQUIRE_ACTIVATE),
    ).toBeTruthy();
    expect(
      getByText(
        strings('bridge.dest_asset_require_activate_warning_title', {
          network: XlmScope.Pubnet,
          token: 'USDC',
        }),
      ),
    ).toBeTruthy();
    expect(
      getByText(
        strings('bridge.dest_asset_require_activate_warning_message', {
          network: XlmScope.Pubnet,
          token: 'USDC',
        }),
      ),
    ).toBeTruthy();
    expect(
      getByText(
        strings('bridge.dest_asset_require_activate_warning_cta', {
          token: 'USDC',
        }),
      ),
    ).toBeTruthy();
  });

  it('navigates to Asset details when the activate CTA is pressed', () => {
    const { getByText } = renderBanner(<DestAssetRequireActivateBanner />, {
      state: createBannerState({
        sourceToken: mockEthSource,
        destToken: mockStellarUsdc,
      }),
    });

    fireEvent.press(
      getByText(
        strings('bridge.dest_asset_require_activate_warning_cta', {
          token: 'USDC',
        }),
      ),
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.push('Asset', {
        ...mockStellarUsdc,
        source: TokenDetailsSource.Swap,
      }),
    );
  });

  it('uses different-account copy and omits the Activate CTA when dest differs from the active account', () => {
    jest.mocked(useDestAssetRequireActivate).mockReturnValue({
      isDestAssetRequireActivate: true,
      isDestSameAsActiveAccount: false,
    });
    jest.mocked(useRecipientDisplayData).mockReturnValue({
      destinationDisplayName: 'Account 2',
      destinationWalletName: undefined,
      destinationAccountAddress: 'GOTHER',
    });

    const { getByTestId, getByText, queryByText } = renderBanner(
      <DestAssetRequireActivateBanner />,
      {
        state: createBannerState({
          sourceToken: mockEthSource,
          destToken: mockStellarUsdc,
        }),
      },
    );

    expect(
      getByTestId(SwapsBannersSelectorsIDs.DEST_ASSET_REQUIRE_ACTIVATE),
    ).toBeTruthy();
    expect(
      getByText(
        strings(
          'bridge.dest_asset_require_activate_warning_message_different_account',
          {
            network: XlmScope.Pubnet,
            account: 'Account 2',
            token: 'USDC',
          },
        ),
      ),
    ).toBeTruthy();
    expect(
      queryByText(
        strings('bridge.dest_asset_require_activate_warning_cta', {
          token: 'USDC',
        }),
      ),
    ).toBeNull();
  });

  it('renders nothing when the destination asset does not require activation', () => {
    jest.mocked(useDestAssetRequireActivate).mockReturnValue({
      isDestAssetRequireActivate: false,
      isDestSameAsActiveAccount: true,
    });

    const { queryByTestId } = renderBanner(<DestAssetRequireActivateBanner />, {
      state: createBannerState({
        sourceToken: mockEthSource,
        destToken: mockStellarUsdc,
      }),
    });

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.DEST_ASSET_REQUIRE_ACTIVATE),
    ).toBeNull();
  });

  it('renders nothing for same-chain destination swaps', () => {
    jest.mocked(useDestAssetRequireActivate).mockReturnValue({
      isDestAssetRequireActivate: false,
      isDestSameAsActiveAccount: true,
    });

    const { queryByTestId } = renderBanner(<DestAssetRequireActivateBanner />, {
      state: createBannerState({
        sourceToken: mockStellarXlm,
        destToken: mockStellarUsdc,
      }),
    });

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.DEST_ASSET_REQUIRE_ACTIVATE),
    ).toBeNull();
  });

  it('renders nothing for destinations that do not require activation', () => {
    jest.mocked(useDestAssetRequireActivate).mockReturnValue({
      isDestAssetRequireActivate: false,
      isDestSameAsActiveAccount: true,
    });

    const { queryByTestId } = renderBanner(<DestAssetRequireActivateBanner />, {
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
      queryByTestId(SwapsBannersSelectorsIDs.DEST_ASSET_REQUIRE_ACTIVATE),
    ).toBeNull();
  });
});
