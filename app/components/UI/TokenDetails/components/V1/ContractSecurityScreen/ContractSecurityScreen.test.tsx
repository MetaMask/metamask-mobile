import React from 'react';
import { fireEvent, render, within } from '@testing-library/react-native';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import { strings } from '../../../../../../../locales/i18n';
import {
  CBXRP_VERIFIED,
  ETHOS_WARNING,
} from '../../../utils/__fixtures__/securityData';
import ContractSecurityScreen from './ContractSecurityScreen';
import { ContractSecuritySelectors } from './ContractSecurityScreen.testIds';
import { STAT_EMPTY_VALUE } from '../../../constants/tokenStats';
import { SECURITY_CONTRACT_CHECKS } from '../SecurityTab/SecurityTab.constants';
import { ContractCheckKey } from '../SecurityTab/SecurityTab.types';

const mockGoBack = jest.fn();

/**
 * The tab hands its resolved payload over on the route, which is the path the
 * screen is reached by in practice.
 */
let mockRouteParams: { token: { securityData?: TokenSecurityData } } = {
  token: { securityData: CBXRP_VERIFIED },
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
}));

const renderScreen = (securityData?: TokenSecurityData) => {
  mockRouteParams = { token: { securityData } };
  return render(<ContractSecurityScreen />);
};

describe('ContractSecurityScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    ).toHaveLength(SECURITY_CONTRACT_CHECKS.length - 1);
  });

  it('renders the four checks, each with its definition', () => {
    const { getByTestId } = renderScreen(CBXRP_VERIFIED);

    for (const checkKey of SECURITY_CONTRACT_CHECKS) {
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
      SECURITY_CONTRACT_CHECKS.map(ContractSecuritySelectors.row),
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

  // Blockaid returns no scan timestamp, so the line carries attribution alone
  // rather than guessing at an age.
  it('attributes the checks to the scanner without claiming a scan age', () => {
    const { getByTestId } = renderScreen(CBXRP_VERIFIED);

    expect(getByTestId(ContractSecuritySelectors.SCAN_META)).toHaveTextContent(
      strings('token_details_v1.security_tab.checks_meta.attribution'),
    );
  });
});
