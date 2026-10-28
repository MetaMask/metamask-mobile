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

const paintedColor = (icon: React.ReactElement) => {
  const { UNSAFE_getByType } = render(icon);
  const node = UNSAFE_getByType(icon.type === SealPercentIcon ? Svg : Path);
  if (node.type === Path) {
    return node.props.fill;
  }
  const style = StyleSheet.flatten(node.props.style);
  return node.props.color ?? style?.color;
};

describe('SealPercentIcon', () => {
  it('uses the icon color token, with IconDefault matching the fees-sheet title', () => {
    const defaultColor = paintedColor(<SealPercentIcon size={24} />);
    const titleColor = paintedColor(
      <FillProbe token={TextColor.TextDefault} />,
    );

    expect(defaultColor).toBe(titleColor);
  });

  it('uses IconAlternative, the same grey as TextAlternative, on form rows', () => {
    const { UNSAFE_getByType } = render(
      <SealPercentIcon size={16} color={IconColor.IconAlternative} />,
    );
    const formColor = UNSAFE_getByType(Svg).props.color;
    const textColor = paintedColor(
      <FillProbe token={TextColor.TextAlternative} />,
    );
    const titleColor = paintedColor(
      <FillProbe token={TextColor.TextDefault} />,
    );

    expect(UNSAFE_getByType(Path).props.fill).toBe('currentColor');
    expect(formColor).toBe(textColor);
    expect(formColor).not.toBe(titleColor);
  });
});
