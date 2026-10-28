import { IconColor, TextColor } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import SealPercentIcon from './SealPercentIcon';

const FillProbe = ({ token }: { token: string }) => {
  const tw = useTailwind();
  const { color } = StyleSheet.flatten(tw.style(token));

  return <Path testID="fill-probe" fill={color} />;
};

const tokenColor = (token: string) => {
  const { UNSAFE_getByType } = render(<FillProbe token={token} />);
  return UNSAFE_getByType(Path).props.fill;
};

const sealStyleColor = (icon: React.ReactElement) => {
  const { UNSAFE_getByType } = render(icon);
  return StyleSheet.flatten(UNSAFE_getByType(Svg).props.style).color;
};

describe('SealPercentIcon', () => {
  it('uses the icon color token, with IconDefault matching the fees-sheet title', () => {
    const defaultColor = sealStyleColor(<SealPercentIcon size={24} />);
    const titleColor = tokenColor(TextColor.TextDefault);

    expect(defaultColor).toBe(titleColor);
  });

  it('paints form rows with IconAlternative through currentColor, like the info icon', () => {
    const { UNSAFE_getByType } = render(
      <SealPercentIcon size={16} color={IconColor.IconAlternative} />,
    );
    const svg = UNSAFE_getByType(Svg);
    const path = UNSAFE_getByType(Path);
    const formColor = StyleSheet.flatten(svg.props.style).color;
    const textColor = tokenColor(TextColor.TextAlternative);
    const titleColor = tokenColor(TextColor.TextDefault);

    expect(svg.props.fill).toBe('currentColor');
    expect(path.props.fill).toBeUndefined();
    expect(formColor).toBe(textColor);
    expect(formColor).not.toBe(titleColor);
  });
});
