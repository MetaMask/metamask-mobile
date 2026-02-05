import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';
import DepositTextField from './DepositTextField';
import Label from '../../../../../../component-library/components/Form/Label';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import TextField from '../../../../../../component-library/components/Form/TextField';

const DEPOSIT_FIELD_TEST_ID = 'deposit-field-test-id';

const mockTheme = {
  colors: {
    text: { muted: '#888888' },
    error: { default: '#FF0000' },
  },
  themeAppearance: 'light',
};

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
    theme: mockTheme,
  }),
}));

describe('DepositTextField', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(<DepositTextField {...defaultProps} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render DepositTextField with correct label', () => {
    const wrapper = shallow(<DepositTextField {...defaultProps} />);
    const labelComponent = wrapper.find(Label);
    expect(labelComponent.exists()).toBe(true);
    expect(labelComponent.prop('variant')).toBe(TextVariant.BodyMD);
    expect(labelComponent.prop('children')).toBe('Test Label');
  });

  it('should render TextField component with correct props', () => {
    const wrapper = shallow(<DepositTextField {...defaultProps} />);
    const textFieldComponent = wrapper.find(TextField);
    expect(textFieldComponent.exists()).toBe(true);
    expect(textFieldComponent.prop('placeholderTextColor')).toBe(
      mockTheme.colors.text.muted,
    );
    expect(textFieldComponent.prop('keyboardAppearance')).toBe(
      mockTheme.themeAppearance,
    );
  });

  it('should render error text when error prop is provided', () => {
    const errorMessage = 'This is an error message';
    const wrapper = shallow(
      <DepositTextField {...defaultProps} error={errorMessage} />,
    );
    const errorComponent = wrapper.find(Text);
    expect(errorComponent.exists()).toBe(true);
    expect(errorComponent.prop('children')).toBe(errorMessage);
  });

  it('should not render error text when error prop is not provided', () => {
    const wrapper = shallow(<DepositTextField {...defaultProps} />);
    const errorComponent = wrapper.find(Text);
    expect(errorComponent.exists()).toBe(false);
  });

  it('should apply custom container style when provided', () => {
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

  it('should pass additional props to TextField', () => {
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
