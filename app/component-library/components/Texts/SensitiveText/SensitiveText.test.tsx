// Third party dependencies
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies
import { mockTheme } from '../../../../util/theme';

// Internal dependencies
import SensitiveText from './SensitiveText';
import { SensitiveTextLength } from './SensitiveText.types';
import { TextVariant, TextColor } from '../Text/Text.types';

describe('SensitiveText', () => {
  const testProps = {
    isHidden: false,
    length: SensitiveTextLength.Short,
    variant: TextVariant.BodyMD,
    color: TextColor.Default,
    children: 'Sensitive Information',
  };

  it('should render correctly', () => {
    const wrapper = render(<SensitiveText {...testProps} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should display the text when isHidden is false', () => {
    const { getByText } = render(<SensitiveText {...testProps} />);
    expect(getByText('Sensitive Information')).toBeTruthy();
  });

  it('should hide the text when isHidden is true', () => {
    const { queryByText, getByText } = render(
      <SensitiveText {...testProps} isHidden />,
    );
    expect(queryByText('Sensitive Information')).toBeNull();
    expect(getByText('*******')).toBeTruthy();
  });

  it('should render the correct number of asterisks for different lengths', () => {
    const { getByText: getShort } = render(
      <SensitiveText
        {...testProps}
        isHidden
        length={SensitiveTextLength.Short}
      />,
    );
    expect(getShort('*******')).toBeTruthy();

    const { getByText: getMedium } = render(
      <SensitiveText
        {...testProps}
        isHidden
        length={SensitiveTextLength.Medium}
      />,
    );
    expect(getMedium('*********')).toBeTruthy();

    const { getByText: getLong } = render(
      <SensitiveText
        {...testProps}
        isHidden
        length={SensitiveTextLength.Long}
      />,
    );
    expect(getLong('*************')).toBeTruthy();
  });

  it('should apply the correct text color', () => {
    const { getByText } = render(
      <SensitiveText {...testProps} color={TextColor.Default} />,
    );
    const textElement = getByText('Sensitive Information');
    expect(textElement.props.style.color).toBe(mockTheme.colors.text.default);
  });

  it('should handle custom length', () => {
    const { getByText } = render(
      <SensitiveText {...testProps} isHidden length="10" />,
    );
    expect(getByText('**********')).toBeTruthy();
  });

  it('should fall back to Short length for invalid custom length', () => {
    const { getByText } = render(
      <SensitiveText {...testProps} isHidden length="invalid" />,
    );
    expect(getByText('*******')).toBeTruthy();
  });

  it('should fall back to Short length for non-numeric custom length', () => {
    const { getByText } = render(
      <SensitiveText {...testProps} isHidden length="abc" />,
    );
    expect(getByText('*******')).toBeTruthy();
  });

  it('should log a warning for invalid custom length', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    render(<SensitiveText {...testProps} isHidden length="abc" />);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Invalid length provided: abc. Falling back to Short.',
    );
    consoleSpy.mockRestore();
  });
});
