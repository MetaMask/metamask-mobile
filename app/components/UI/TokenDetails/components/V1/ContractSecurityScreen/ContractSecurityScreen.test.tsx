import React from 'react';
import { act, fireEvent, render, within } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import type { CaipAssetType } from '@metamask/utils';
import { strings } from '../../../../../../../locales/i18n';
import {
  CBXRP_VERIFIED,
  ETHOS_WARNING,
} from '../../../utils/__fixtures__/securityData';
import ContractSecurityScreen from './ContractSecurityScreen';
import { ContractSecuritySelectors } from './ContractSecurityScreen.testIds';
import { STAT_EMPTY_VALUE } from '../../../constants/tokenStats';
import {
  CONTRACT_CHECK_KEYS,
  ContractCheckKey,
} from '../SecurityTab/SecurityTab.types';
import { tokenListSecurityBadgeKeys } from '../../../../Tokens/queries/tokenSecurityBadgeKeys';
import { requestTokenSecurityForAsset } from '../../../../Tokens/util/tokenSecurityBadgeBatch';

const mockGoBack = jest.fn();

const TOKEN_CAIP_ASSET_ID =
  'eip155:1/erc20:0x6982508145454ce325ddbe47a25d4ec3d2311933' as CaipAssetType;

/**
 * The route carries the token only. The payload comes off the shared query
 * entry, which is the path the screen is reached by in practice: the tab has
 * just read that entry, so this screen renders from cache without fetching.
 */
let mockRouteParams: { token: { caipAssetId: CaipAssetType } } = {
  token: { caipAssetId: TOKEN_CAIP_ASSET_ID },
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('../../../../Tokens/util/tokenSecurityBadgeBatch', () => ({
  ...jest.requireActual('../../../../Tokens/util/tokenSecurityBadgeBatch'),
  requestTokenSecurityForAsset: jest.fn(async () => null),
}));

const mockRequestTokenSecurityForAsset = jest.mocked(
  requestTokenSecurityForAsset,
);

const renderScreen = (securityData?: TokenSecurityData) => {
  mockRouteParams = { token: { caipAssetId: TOKEN_CAIP_ASSET_ID } };

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  if (securityData) {
    queryClient.setQueryData(
      tokenListSecurityBadgeKeys.byAsset(TOKEN_CAIP_ASSET_ID),
      securityData,
    );
  }

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ContractSecurityScreen />
      </QueryClientProvider>,
    ),
  };
};

describe('ContractSecurityScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestTokenSecurityForAsset.mockResolvedValue(null);
  });

  // Both headings are the only landmarks on a screen of rows that each carry a
  // sentence, so a screen reader needs them to skip the first group
  // (WCAG 1.3.1, 2.4.6).
  it('announces the title and the additional-checks heading as headings', () => {
    const { getByTestId, getByText } = renderScreen(CBXRP_VERIFIED);

    expect(getByTestId(ContractSecuritySelectors.TITLE)).toHaveProp(
      'accessibilityRole',
      'header',
    );
    expect(
      getByText(
        strings('token_details_v1.security_tab.sections.additional_checks'),
      ),
    ).toHaveProp('accessibilityRole', 'header');
  });

  // One rule per gap, not one per row. The count is the assertion: a rule
  // attached to each row instead would give four here, and would leave a line
  // stranded above the "Additional checks" border.
  it('rules the gaps between the contract rows and no more', () => {
    const { getByTestId } = renderScreen(CBXRP_VERIFIED);

    const group = within(
      getByTestId(ContractSecuritySelectors.SECTION_CONTRACT),
    );

    expect(
      group.getAllByTestId(ContractSecuritySelectors.DIVIDER),
    ).toHaveLength(CONTRACT_CHECK_KEYS.length - 1);
  });

  it('renders the four checks, each with its definition', () => {
    const { getByTestId } = renderScreen(CBXRP_VERIFIED);

    for (const checkKey of CONTRACT_CHECK_KEYS) {
      expect(
        getByTestId(ContractSecuritySelectors.rowDescription(checkKey)),
      ).not.toHaveTextContent(/\[missing/iu);
    }
  });

  it('orders the contract group as its constant declares', () => {
    const { getByTestId } = renderScreen(CBXRP_VERIFIED);

    const renderedOrder = within(
      getByTestId(ContractSecuritySelectors.SECTION_CONTRACT),
    )
      .getAllByTestId(/-row-[a-z_]+$/)
      .map((row) => row.props.testID);

    expect(renderedOrder).toStrictEqual(
      CONTRACT_CHECK_KEYS.map(ContractSecuritySelectors.row),
    );
  });

  // Solana sends neither `VERIFIED_CONTRACT` nor `UNVERIFIED_CONTRACT`, which
  // is the one check that can honestly say it does not know.
  it('dashes the check the payload leaves unresolved', () => {
    const { getByTestId } = renderScreen(ETHOS_WARNING);

    expect(
      getByTestId(
        ContractSecuritySelectors.rowValue(ContractCheckKey.ContractVerified),
      ),
    ).toHaveTextContent(STAT_EMPTY_VALUE);
  });

  describe('findings', () => {
    it('names each flag behind a warning verdict', () => {
      const { getByTestId } = renderScreen(ETHOS_WARNING);

      const group = within(
        getByTestId(ContractSecuritySelectors.SECTION_ADDITIONAL),
      );

      for (const featureId of [
        'WASH_TRADING',
        'HIGH_DEV_PERCENTAGE',
        'SNIPE_AT_MINT',
      ]) {
        expect(
          group.getByTestId(ContractSecuritySelectors.reason(featureId)),
        ).toBeOnTheScreen();
      }
    });

    // The whole reason `Info` is excluded: this token is `Verified` and also
    // mintable and blacklistable, all three typed the same way.
    it('never lists a capability flag as a reason a token is low risk', () => {
      const { queryByTestId } = renderScreen(CBXRP_VERIFIED);

      for (const featureId of ['CAN_BLACKLIST', 'IS_MINTABLE']) {
        expect(
          queryByTestId(ContractSecuritySelectors.reason(featureId)),
        ).toBeNull();
      }
    });

    // A clean token on a chain Blockaid says little about is the common case,
    // so the empty list needs to read as an answer rather than a loading gap.
    it('says so when there is nothing to report', () => {
      const { getByTestId } = renderScreen();

      expect(
        getByTestId(ContractSecuritySelectors.SECTION_ADDITIONAL),
      ).toHaveTextContent(
        strings('token_details_v1.security_tab.reasons.empty'),
      );
    });
  });

  it('goes back from the header button', () => {
    const { getByTestId } = renderScreen(CBXRP_VERIFIED);

    fireEvent.press(getByTestId(ContractSecuritySelectors.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  // Freshly seeded data is seconds old, so the clause reads "just now" rather
  // than "0 min ago".
  it('attributes the checks to the scanner and reads "just now" for fresh data', () => {
    const { getByTestId } = renderScreen(CBXRP_VERIFIED);

    // Asserted on the accessibility label because the provider is a logo with
    // no on-screen text; the label is the only place both halves appear.
    expect(getByTestId(ContractSecuritySelectors.SCAN_META)).toHaveProp(
      'accessibilityLabel',
      [
        strings('token_details_v1.security_tab.checks_meta.attribution'),
        strings(
          'token_details_v1.security_tab.checks_meta.age_clause_just_now',
        ),
      ].join(' '),
    );
  });

  it('reports how long ago the payload was fetched once it has age', () => {
    jest.useFakeTimers();
    try {
      const { getByTestId } = renderScreen(CBXRP_VERIFIED);

      act(() => {
        jest.advanceTimersByTime(5 * 60_000);
      });

      const scanMeta = getByTestId(ContractSecuritySelectors.SCAN_META);

      expect(scanMeta).toHaveTextContent(
        strings('token_details_v1.security_tab.checks_meta.age_clause', {
          count: 5,
        }),
      );
      expect(scanMeta).toHaveProp(
        'accessibilityLabel',
        [
          strings('token_details_v1.security_tab.checks_meta.attribution'),
          strings('token_details_v1.security_tab.checks_meta.age_clause', {
            count: 5,
          }),
        ].join(' '),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  // The whole point of the shared entry: arriving from the tab must not fire a
  // second request for the token the user is already looking at.
  it('renders from the shared query entry without fetching', () => {
    const { getByTestId } = renderScreen(CBXRP_VERIFIED);

    expect(mockRequestTokenSecurityForAsset).not.toHaveBeenCalled();
    expect(
      getByTestId(
        ContractSecuritySelectors.row(ContractCheckKey.ContractVerified),
      ),
    ).toBeOnTheScreen();
  });

  it('fetches when the entry is cold, as on a deep link', () => {
    renderScreen();

    expect(mockRequestTokenSecurityForAsset).toHaveBeenCalledWith(
      TOKEN_CAIP_ASSET_ID,
    );
  });
});
