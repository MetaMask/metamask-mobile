import React from 'react';
import { render, screen } from '@testing-library/react-native';
import DepositTextField from './DepositTextField';
import { mockTheme } from '../../../../../../util/theme';
import { AppThemeKey, Theme } from '../../../../../../util/theme/models';

const DEPOSIT_FIELD_TEST_ID = 'deposit-field-test-id';

let mockCurrentTheme: Theme = mockTheme;

const defaultProps = {
  label: 'Test Label',
  testID: DEPOSIT_FIELD_TEST_ID,
};

jest.mock('../../../../../hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {
      field: {},
      label: {},
      error: {},
    },
    theme: mockCurrentTheme,
  }),
}));

describe('DepositTextField', () => {
  it('should render default settings correctly', () => {
    const { toJSON } = render(<DepositTextField {...defaultProps} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render DepositTextField with correct label', () => {
    render(<DepositTextField {...defaultProps} />);
    expect(screen.getByText('Test Label')).toBeDefined();
  });

  it('should render TextField component with correct props', () => {
    const { toJSON } = render(<DepositTextField {...defaultProps} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('uses dark keyboard appearance in dark theme', () => {
    mockCurrentTheme = {
      ...mockTheme,
      themeAppearance: AppThemeKey.dark,
    };

    render(<DepositTextField {...defaultProps} />);

    expect(
      screen.getByTestId(DEPOSIT_FIELD_TEST_ID).props.keyboardAppearance,
    ).toBe(AppThemeKey.dark);

    mockCurrentTheme = mockTheme;
  });

  it('renders error text when error prop is provided', () => {
    const errorMessage = 'This is an error message';
    render(<DepositTextField {...defaultProps} error={errorMessage} />);
    expect(screen.getByText(errorMessage)).toBeDefined();
  });

  it('should not render error text when error prop is not provided', () => {
    render(<DepositTextField {...defaultProps} />);
    expect(screen.queryByText('This is an error message')).toBeNull();
  });

  it('should apply custom container style when provided', () => {
    const { toJSON } = render(
      <DepositTextField {...defaultProps} containerStyle={{ marginTop: 20 }} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('passes additional props to TextField', () => {
    const placeholder = 'Enter your text here';
    const maxLength = 50;
    const { toJSON } = render(
      <DepositTextField
        {...defaultProps}
        placeholder={placeholder}
        maxLength={maxLength}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
