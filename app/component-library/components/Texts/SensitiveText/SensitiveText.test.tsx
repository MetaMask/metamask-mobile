// Third party dependencies
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies
import { mockTheme } from '../../../../util/theme';

// Internal dependencies
import SensitiveText from './SensitiveText';
import { SensitiveLengths } from './SensitiveText.types';
import { TextVariant, TextColor } from '../Text/Text.types';

describe('SensitiveText', () => {
  const testProps = {
    isHidden: false,
    length: SensitiveLengths.Short,
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
      <SensitiveText {...testProps} isHidden length={SensitiveLengths.Short} />,
    );
    expect(getShort('*******')).toBeTruthy();

    const { getByText: getMedium } = render(
      <SensitiveText
        {...testProps}
        isHidden
        length={SensitiveLengths.Medium}
      />,
    );
    expect(getMedium('*********')).toBeTruthy();

    const { getByText: getLong } = render(
      <SensitiveText {...testProps} isHidden length={SensitiveLengths.Long} />,
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
});
