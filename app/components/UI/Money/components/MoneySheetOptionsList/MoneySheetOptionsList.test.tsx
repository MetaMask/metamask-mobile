import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneySheetOptionsList, {
  MoneySheetOption,
} from './MoneySheetOptionsList';
import { strings } from '../../../../../../locales/i18n';

const createOption = (
  overrides: Partial<MoneySheetOption> = {},
): MoneySheetOption => ({
  label: 'Convert crypto',
  icon: IconName.Add,
  onPress: jest.fn(),
  testID: 'money-sheet-option-convert-crypto',
  ...overrides,
});

describe('MoneySheetOptionsList', () => {
  it('renders a row and label for each option', () => {
    const options = [
      createOption({
        label: 'Convert crypto',
        testID: 'money-sheet-option-convert-crypto',
      }),
      createOption({
        label: 'Debit card or bank account',
        icon: IconName.Bank,
        testID: 'money-sheet-option-deposit-funds',
      }),
    ];

    const { getByTestId, getByText } = renderWithProvider(
      <MoneySheetOptionsList options={options} />,
    );

    expect(getByTestId('money-sheet-option-convert-crypto')).toBeOnTheScreen();
    expect(getByTestId('money-sheet-option-deposit-funds')).toBeOnTheScreen();
    expect(getByText('Convert crypto')).toBeOnTheScreen();
    expect(getByText('Debit card or bank account')).toBeOnTheScreen();
  });

  it('calls onPress when an enabled option is pressed', () => {
    const onPress = jest.fn();
    const options = [createOption({ onPress })];

    const { getByTestId } = renderWithProvider(
      <MoneySheetOptionsList options={options} />,
    );
    fireEvent.press(getByTestId('money-sheet-option-convert-crypto'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does nothing when an option without onPress is pressed', () => {
    const options = [createOption({ onPress: undefined })];

    const { getByTestId } = renderWithProvider(
      <MoneySheetOptionsList options={options} />,
    );

    expect(() =>
      fireEvent.press(getByTestId('money-sheet-option-convert-crypto')),
    ).not.toThrow();
  });

  it('enables an option without the disabled flag', () => {
    const options = [createOption()];

    const { getByTestId } = renderWithProvider(
      <MoneySheetOptionsList options={options} />,
    );

    expect(getByTestId('money-sheet-option-convert-crypto')).toBeEnabled();
  });

  it('disables an option with the disabled flag', () => {
    const options = [createOption({ disabled: true })];

    const { getByTestId } = renderWithProvider(
      <MoneySheetOptionsList options={options} />,
    );

    expect(getByTestId('money-sheet-option-convert-crypto')).toBeDisabled();
  });

  it('does not call onPress when a disabled option is pressed', () => {
    const onPress = jest.fn();
    const options = [createOption({ onPress, disabled: true })];

    const { getByTestId } = renderWithProvider(
      <MoneySheetOptionsList options={options} />,
    );
    fireEvent.press(getByTestId('money-sheet-option-convert-crypto'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders a "Coming soon" tag next to the label for a comingSoon option', () => {
    const options = [
      createOption({
        label: 'External address',
        testID: 'money-sheet-option-receive-external',
        comingSoon: true,
      }),
    ];

    const { getByText } = renderWithProvider(
      <MoneySheetOptionsList options={options} />,
    );

    expect(getByText('External address')).toBeOnTheScreen();
    expect(
      getByText(strings('money.add_money_sheet.coming_soon')),
    ).toBeOnTheScreen();
  });

  it('does not render a "Coming soon" tag for options without the comingSoon flag', () => {
    const options = [createOption()];

    const { queryByText } = renderWithProvider(
      <MoneySheetOptionsList options={options} />,
    );

    expect(
      queryByText(strings('money.add_money_sheet.coming_soon')),
    ).toBeNull();
  });

  it('renders disabled options after enabled ones regardless of input order', () => {
    const options = [
      createOption({
        label: 'External address',
        testID: 'money-sheet-option-receive-external',
        disabled: true,
      }),
      createOption({
        label: 'Convert crypto',
        testID: 'money-sheet-option-convert-crypto',
      }),
      createOption({
        label: 'Add mUSD',
        icon: IconName.Card,
        testID: 'money-sheet-option-add-musd',
        disabled: true,
      }),
      createOption({
        label: 'Debit card or bank account',
        icon: IconName.Bank,
        testID: 'money-sheet-option-deposit-funds',
      }),
    ];

    const { getAllByTestId } = renderWithProvider(
      <MoneySheetOptionsList options={options} />,
    );

    const renderedTestIds = getAllByTestId(/^money-sheet-option-/).map(
      (row) => row.props.testID,
    );
    expect(renderedTestIds).toEqual([
      'money-sheet-option-convert-crypto',
      'money-sheet-option-deposit-funds',
      'money-sheet-option-receive-external',
      'money-sheet-option-add-musd',
    ]);
  });
});
