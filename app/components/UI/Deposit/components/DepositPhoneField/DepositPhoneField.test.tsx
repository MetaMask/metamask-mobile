// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';
import DepositPhoneField from './DepositPhoneField';
import Label from '../../../../../component-library/components/Form/Label';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import TextField, {
  TextFieldSize,
} from '../../../../../component-library/components/Form/TextField';

const DEPOSIT_PHONE_FIELD_TEST_ID = 'deposit-phone-field-test-id';

describe('DepositPhoneField', () => {
  const mockTheme = {
    colors: {
      text: { muted: '#9ca1af' },
      error: { default: '#FF0000' },
      border: { default: '#CCCCCC' },
      background: { default: '#FFFFFF' },
    },
    themeAppearance: 'light',
  };

  jest.mock('../../../../../component-library/hooks', () => ({
    useStyles: () => ({
      styles: {
        label: { marginBottom: 6 },
        field: { flexDirection: 'column', marginBottom: 16 },
        phoneInputWrapper: { flexDirection: 'row', alignItems: 'center' },
        countryPrefix: {
          flexDirection: 'row',
          alignItems: 'center',
          height: 48,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: mockTheme.colors.border.default,
          borderRightWidth: 0,
          borderTopLeftRadius: 8,
          borderBottomLeftRadius: 8,
          backgroundColor: mockTheme.colors.background.default,
        },
        countryFlag: { fontSize: 16, marginRight: 4 },
        countryCode: { fontSize: 14 },
        phoneInput: {
          flex: 1,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
        },
        error: {
          color: mockTheme.colors.error.default,
          fontSize: 12,
          marginTop: 4,
        },
      },
      theme: mockTheme,
    }),
  }));

  const mockOnChangeText = jest.fn();

  const defaultProps = {
    label: 'Phone Number',
    onChangeText: mockOnChangeText,
    testID: DEPOSIT_PHONE_FIELD_TEST_ID,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render default settings correctly', () => {
    const wrapper = shallow(<DepositPhoneField {...defaultProps} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render DepositPhoneField with correct label', () => {
    const wrapper = shallow(<DepositPhoneField {...defaultProps} />);
    const labelComponent = wrapper.find(Label);

    expect(labelComponent.exists()).toBe(true);
    expect(labelComponent.prop('variant')).toBe(TextVariant.HeadingSMRegular);
    expect(labelComponent.prop('children')).toBe('Phone Number');
  });

  it('should render TextField component with correct props', () => {
    const wrapper = shallow(<DepositPhoneField {...defaultProps} />);
    const textFieldComponent = wrapper.find(TextField);

    expect(textFieldComponent.exists()).toBe(true);
    expect(textFieldComponent.prop('size')).toBe(TextFieldSize.Lg);
    expect(textFieldComponent.prop('placeholderTextColor')).toBe(
      mockTheme.colors.text.muted,
    );
    expect(textFieldComponent.prop('keyboardType')).toBe('phone-pad');
    expect(textFieldComponent.prop('keyboardAppearance')).toBe(
      mockTheme.themeAppearance,
    );
  });

  it('should render default country code and flag', () => {
    const wrapper = shallow(<DepositPhoneField {...defaultProps} />);

    const countryPrefixView = wrapper.find(View).at(2); // The View containing country code and flag
    const countryFlagText = countryPrefixView.childAt(0);
    const countryCodeText = countryPrefixView.childAt(1);

    expect(countryFlagText.prop('children')).toBe('🇺🇸');
    expect(countryCodeText.prop('children')).toEqual(['+', '1']);
  });

  it('should render custom country code and flag when provided', () => {
    const customProps = {
      ...defaultProps,
      countryCode: '44',
      countryFlag: '🇬🇧',
    };

    const wrapper = shallow(<DepositPhoneField {...customProps} />);

    const countryPrefixView = wrapper.find(View).at(2);
    const countryFlagText = countryPrefixView.childAt(0);
    const countryCodeText = countryPrefixView.childAt(1);

    expect(countryFlagText.prop('children')).toBe('🇬🇧');
    expect(countryCodeText.prop('children')).toEqual(['+', '44']);
  });

  it('should render error text when error prop is provided', () => {
    const errorMessage = 'Invalid phone number';
    const wrapper = shallow(
      <DepositPhoneField {...defaultProps} error={errorMessage} />,
    );

    const errorComponent = wrapper.find(Text).last();
    expect(errorComponent.exists()).toBe(true);
    expect(errorComponent.prop('children')).toBe(errorMessage);
  });

  it('should not render error text when error prop is not provided', () => {
    const wrapper = shallow(<DepositPhoneField {...defaultProps} />);
    const textComponents = wrapper.find(Text);
    expect(textComponents).toHaveLength(2);
  });

  it('should call onChangeText when text input changes', () => {
    const wrapper = shallow(<DepositPhoneField {...defaultProps} />);
    const textFieldComponent = wrapper.find(TextField);

    const phoneNumber = '5551234567';
    textFieldComponent.simulate('changeText', phoneNumber);

    expect(mockOnChangeText).toHaveBeenCalledWith(phoneNumber);
  });

  it('should pass additional props to TextField', () => {
    const placeholder = 'Enter phone number';
    const maxLength = 10;

    const wrapper = shallow(
      <DepositPhoneField
        {...defaultProps}
        placeholder={placeholder}
        maxLength={maxLength}
      />,
    );

    const textFieldComponent = wrapper.find(TextField);
    expect(textFieldComponent.prop('placeholder')).toBe(placeholder);
    expect(textFieldComponent.prop('maxLength')).toBe(maxLength);
  });

  it('should apply custom phoneInput style', () => {
    const wrapper = shallow(<DepositPhoneField {...defaultProps} />);
    const textFieldComponent = wrapper.find(TextField);

    expect(textFieldComponent.prop('style')).toEqual({
      flex: 1,
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
    });
  });
});
