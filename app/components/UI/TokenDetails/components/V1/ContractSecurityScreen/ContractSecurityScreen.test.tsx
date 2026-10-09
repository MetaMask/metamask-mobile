import React from 'react';
import { fireEvent, render, within } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import ContractSecurityScreen from './ContractSecurityScreen';
import { ContractSecuritySelectors } from './ContractSecurityScreen.testIds';
import {
  SECURITY_ADDITIONAL_CHECKS,
  SECURITY_CONTRACT_CHECKS,
  SECURITY_EMPTY_VALUE,
} from '../SecurityTab/SecurityTab.constants';
import {
  AdditionalCheckKey,
  ContractCheckKey,
} from '../SecurityTab/SecurityTab.types';

const mockGoBack = jest.fn();

/** An EVM address routes the facts hook to the EVM fixture. */
let mockRouteParams: { token: { chainId: string } } = {
  token: { chainId: '0x1' },
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
}));

describe('ContractSecurityScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { token: { chainId: '0x1' } };
  });

  // Both headings are the only landmarks on a screen of seven rows that each
  // carry a sentence, so a screen reader needs them to skip the first group
  // (WCAG 1.3.1, 2.4.6).
  it('announces the title and the additional-checks heading as headings', () => {
    const { getByTestId, getByText } = render(<ContractSecurityScreen />);

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
  // stranded above the "Additional checks" border and the footer.
  it.each([
    [
      'contract',
      ContractSecuritySelectors.SECTION_CONTRACT,
      SECURITY_CONTRACT_CHECKS,
    ],
    [
      'additional',
      ContractSecuritySelectors.SECTION_ADDITIONAL,
      SECURITY_ADDITIONAL_CHECKS,
    ],
  ] as const)(
    'rules the gaps between the %s rows and no more',
    (_label, sectionTestId, checkKeys) => {
      const { getByTestId } = render(<ContractSecurityScreen />);

      const group = within(getByTestId(sectionTestId));

      expect(
        group.getAllByTestId(ContractSecuritySelectors.DIVIDER),
      ).toHaveLength(checkKeys.length - 1);
    },
  );

  it('renders both check groups under the screen title', () => {
    const { getByTestId } = render(<ContractSecurityScreen />);

    expect(getByTestId(ContractSecuritySelectors.TITLE)).toHaveTextContent(
      strings('token_details_v1.contract_security.title'),
    );
    expect(
      getByTestId(ContractSecuritySelectors.SECTION_CONTRACT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(ContractSecuritySelectors.SECTION_ADDITIONAL),
    ).toBeOnTheScreen();
  });

  // The screen is the only place the additional three appear, so losing them
  // here loses them from the app.
  it('renders all seven checks, each with its definition', () => {
    const { getByTestId } = render(<ContractSecurityScreen />);

    for (const checkKey of [
      ...SECURITY_CONTRACT_CHECKS,
      ...SECURITY_ADDITIONAL_CHECKS,
    ]) {
      expect(
        getByTestId(ContractSecuritySelectors.rowDescription(checkKey)),
      ).not.toHaveTextContent(/\[missing/iu);
    }
  });

  it('puts the additional checks in their own group', () => {
    const { getByTestId } = render(<ContractSecurityScreen />);
    const additional = within(
      getByTestId(ContractSecuritySelectors.SECTION_ADDITIONAL),
    );

    expect(
      additional.getByTestId(
        ContractSecuritySelectors.row(AdditionalCheckKey.RugPullRisk),
      ),
    ).toBeOnTheScreen();
    expect(
      additional.queryByTestId(
        ContractSecuritySelectors.row(ContractCheckKey.NoHoneypot),
      ),
    ).toBeNull();
  });

  it('orders each group as its constant declares', () => {
    const { getByTestId } = render(<ContractSecurityScreen />);

    const renderedOrder = within(
      getByTestId(ContractSecuritySelectors.SECTION_CONTRACT),
    )
      .getAllByTestId(/-row-[a-z_]+$/)
      .map((row) => row.props.testID);

    expect(renderedOrder).toStrictEqual(
      SECURITY_CONTRACT_CHECKS.map(ContractSecuritySelectors.row),
    );
  });

  // The Solana fixture leaves `contract_verified` unresolved, which is the
  // check least likely to resolve there in practice.
  it('dashes a check the fixture leaves unresolved', () => {
    mockRouteParams = {
      token: { chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' },
    };

    const { getByTestId } = render(<ContractSecurityScreen />);

    expect(
      getByTestId(
        ContractSecuritySelectors.rowValue(ContractCheckKey.ContractVerified),
      ),
    ).toHaveTextContent(SECURITY_EMPTY_VALUE);
  });

  it('goes back from the header button', () => {
    const { getByTestId } = render(<ContractSecurityScreen />);

    fireEvent.press(getByTestId(ContractSecuritySelectors.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('attributes the checks to the scanner and names the scan age', () => {
    const { getByTestId } = render(<ContractSecurityScreen />);

    expect(getByTestId(ContractSecuritySelectors.SCAN_META)).toHaveTextContent(
      strings('token_details_v1.security_tab.checks_meta.attribution_checked', {
        count: 2,
      }),
    );
  });
});
