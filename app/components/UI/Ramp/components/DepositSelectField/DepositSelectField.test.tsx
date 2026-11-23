import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DepositSelectField from './DepositSelectField';
import { ThemeContext, mockTheme } from '../../../../../util/theme';

const mockNavigation = { navigate: jest.fn() };
const mockNavigateWithDetails = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  navigateWithDetails: (...args: unknown[]) => mockNavigateWithDetails(...args),
}));

jest.mock('../../Views/Modals/OptionSelectorModal', () => ({
  createOptionSelectorModalNavigationDetails: (params: unknown) => [
    'OptionSelector',
    params,
  ],
}));

const options = [
  { name: 'Savings', value: 'savings' },
  { name: 'Salary', value: 'salary' },
];

const renderField = (
  props: Partial<React.ComponentProps<typeof DepositSelectField>> = {},
) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      <DepositSelectField
        label="Source of funds"
        options={options}
        selectedValue=""
        onValueChange={jest.fn()}
        testID="select-field"
        {...props}
      />
    </ThemeContext.Provider>,
  );

describe('DepositSelectField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the label and the placeholder when nothing is selected', () => {
    const { getByText } = renderField({ placeholder: 'Pick one' });

    expect(getByText('Source of funds')).toBeOnTheScreen();
    expect(getByText('Pick one')).toBeOnTheScreen();
  });

  it('shows the name of the selected option', () => {
    const { getByText } = renderField({ selectedValue: 'salary' });

    expect(getByText('Salary')).toBeOnTheScreen();
  });

  it('shows the error text when an error is provided', () => {
    const { getByText } = renderField({ error: 'Required' });

    expect(getByText('Required')).toBeOnTheScreen();
  });

  it('does not render error text without an error', () => {
    const { queryByText } = renderField();

    expect(queryByText('Required')).not.toBeOnTheScreen();
  });

  it('opens the option selector with the options when pressed', () => {
    const onValueChange = jest.fn();
    const { getByTestId } = renderField({
      selectedValue: 'savings',
      onValueChange,
    });

    fireEvent.press(getByTestId('select-field'));

    expect(mockNavigateWithDetails).toHaveBeenCalledWith(mockNavigation, [
      'OptionSelector',
      {
        title: 'Source of funds',
        options,
        selectedValue: 'savings',
        onSelect: onValueChange,
      },
    ]);
  });
});
