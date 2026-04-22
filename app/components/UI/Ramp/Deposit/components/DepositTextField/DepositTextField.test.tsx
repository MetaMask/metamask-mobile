import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';
import DepositTextField from './DepositTextField';
import { Label } from '@metamask/design-system-react-native';
import Text from '../../../../../../component-library/components/Texts/Text';
import TextField from '../../../../../../component-library/components/Form/TextField';
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
  beforeEach(() => {
    mockCurrentTheme = mockTheme;
  });

  it('renders default settings correctly', () => {
    const wrapper = shallow(<DepositTextField {...defaultProps} />);
    expect(wrapper.find(Label).exists()).toBe(true);
    expect(wrapper.find(TextField).exists()).toBe(true);
  });

  it('renders DepositTextField with correct label', () => {
    const wrapper = shallow(<DepositTextField {...defaultProps} />);
    const labelComponent = wrapper.find(Label);
    expect(labelComponent.exists()).toBe(true);
    expect(labelComponent.prop('children')).toBe('Test Label');
  });

  it('renders TextField component with correct props', () => {
    const wrapper = shallow(<DepositTextField {...defaultProps} />);
    const textFieldComponent = wrapper.find(TextField);
    expect(textFieldComponent.exists()).toBe(true);
    expect(textFieldComponent.prop('keyboardAppearance')).toBe(
      mockTheme.themeAppearance,
    );
  });

  it('uses dark keyboard appearance in dark theme', () => {
    mockCurrentTheme = {
      ...mockTheme,
      themeAppearance: AppThemeKey.dark,
    };

    const wrapper = shallow(<DepositTextField {...defaultProps} />);
    const textFieldComponent = wrapper.find(TextField);

    expect(textFieldComponent.prop('keyboardAppearance')).toBe(
      AppThemeKey.dark,
    );
  });

  it('renders error text when error prop is provided', () => {
    const errorMessage = 'This is an error message';
    const wrapper = shallow(
      <DepositTextField {...defaultProps} error={errorMessage} />,
    );
    const errorComponent = wrapper.find(Text);
    expect(errorComponent.exists()).toBe(true);
    expect(errorComponent.prop('children')).toBe(errorMessage);
  });

  it('does not render error text when error prop is not provided', () => {
    const wrapper = shallow(<DepositTextField {...defaultProps} />);
    const errorComponent = wrapper.find(Text);
    expect(errorComponent.exists()).toBe(false);
  });

  it('applies custom container style when provided', () => {
    const customStyle = { marginTop: 20 };
    const wrapper = shallow(
      <DepositTextField {...defaultProps} containerStyle={customStyle} />,
    );
    const container = wrapper.find(View).first();
    const containerStyle = container.prop('style');
    expect(containerStyle).toEqual(
      expect.arrayContaining([expect.objectContaining(customStyle)]),
    );
  });

  it('passes additional props to TextField', () => {
    const placeholder = 'Enter your text here';
    const maxLength = 50;
    const wrapper = shallow(
      <DepositTextField
        {...defaultProps}
        placeholder={placeholder}
        maxLength={maxLength}
      />,
    );
    const textFieldComponent = wrapper.find(TextField);
    expect(textFieldComponent.prop('placeholder')).toBe(placeholder);
    expect(textFieldComponent.prop('maxLength')).toBe(maxLength);
  });
});
