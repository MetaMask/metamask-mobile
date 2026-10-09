import React from 'react';
import { render } from '@testing-library/react-native';
import {
  IconColor,
  IconName,
  TextColor,
} from '@metamask/design-system-react-native';
import { SECURITY_EMPTY_VALUE } from '../../SecurityTab/SecurityTab.constants';
import { ContractCheckKey } from '../../SecurityTab/SecurityTab.types';
import { ContractSecuritySelectors } from '../ContractSecurityScreen.testIds';
import SecurityDetailRow from './SecurityDetailRow';

const CHECK_KEY = ContractCheckKey.NoHoneypot;

const renderRow = (
  props: Partial<React.ComponentProps<typeof SecurityDetailRow>> = {},
) =>
  render(
    <SecurityDetailRow
      checkKey={CHECK_KEY}
      label="No honeypot"
      value="Sells work"
      description="Whether the token can be sold."
      {...props}
    />,
  );

describe('SecurityDetailRow', () => {
  it('shows the label, value and definition together', () => {
    const { getByTestId } = renderRow();

    expect(
      getByTestId(ContractSecuritySelectors.rowLabel(CHECK_KEY)),
    ).toHaveTextContent('No honeypot');
    expect(
      getByTestId(ContractSecuritySelectors.rowValue(CHECK_KEY)),
    ).toHaveTextContent('Sells work');
    expect(
      getByTestId(ContractSecuritySelectors.rowDescription(CHECK_KEY)),
    ).toHaveTextContent('Whether the token can be sold.');
  });

  it('renders the glyph when one is supplied', () => {
    const { getByTestId } = renderRow({
      icon: { name: IconName.CheckBold, color: IconColor.SuccessDefault },
    });

    expect(
      getByTestId(ContractSecuritySelectors.rowIcon(CHECK_KEY)),
    ).toBeOnTheScreen();
  });

  // The definition is printed, so there is nothing hidden behind the label.
  // A dotted underline here would promise a tap that does nothing.
  it('leaves the label untappable', () => {
    const { getByTestId } = renderRow();

    expect(
      getByTestId(ContractSecuritySelectors.rowLabel(CHECK_KEY)),
    ).not.toHaveProp('accessibilityRole', 'button');
  });

  // Blockaid reports the risks it found, never the checks it ran, so an
  // unresolved check must not borrow the glyph of a passing one.
  it('shows the dash and suppresses the glyph when there is no value', () => {
    const { getByTestId, queryByTestId } = renderRow({
      value: null,
      icon: { name: IconName.CheckBold, color: IconColor.SuccessDefault },
      valueColor: TextColor.SuccessDefault,
    });

    expect(
      getByTestId(ContractSecuritySelectors.rowValue(CHECK_KEY)),
    ).toHaveTextContent(SECURITY_EMPTY_VALUE);
    expect(
      queryByTestId(ContractSecuritySelectors.rowIcon(CHECK_KEY)),
    ).toBeNull();
  });

  it('keeps the definition visible for an unresolved check', () => {
    const { getByTestId } = renderRow({ value: null });

    expect(
      getByTestId(ContractSecuritySelectors.rowDescription(CHECK_KEY)),
    ).toHaveTextContent('Whether the token can be sold.');
  });

  // Spacing and rules live between rows, so the group owns both. A row that
  // carried either would double the gap at the ends of a list and strand a
  // line above the section border that follows it.
  it('carries no rule or vertical spacing of its own', () => {
    const { getByTestId } = renderRow();

    const row = getByTestId(ContractSecuritySelectors.row(CHECK_KEY));

    expect(row).not.toHaveStyle({ borderBottomWidth: 1 });
    expect(row).toHaveStyle({
      paddingTop: undefined,
      paddingBottom: undefined,
    });
  });
});
