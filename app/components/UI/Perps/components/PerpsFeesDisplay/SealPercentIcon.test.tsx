import { IconColor, TextColor } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Path } from 'react-native-svg';
import SealPercentIcon from './SealPercentIcon';

const FillProbe = ({ token }: { token: string }) => {
  const tw = useTailwind();
  const { color } = StyleSheet.flatten(tw.style(token));

  return <Path testID="fill-probe" fill={color} />;
};

const pathFill = (icon: React.ReactElement) => {
  const { UNSAFE_getByType } = render(icon);
  return UNSAFE_getByType(Path).props.fill;
};

describe('SealPercentIcon', () => {
  it('uses the icon color token, with IconDefault matching the fees-sheet title', () => {
    const defaultFill = pathFill(<SealPercentIcon size={24} />);
    const titleFill = pathFill(<FillProbe token={TextColor.TextDefault} />);

    expect(defaultFill).toBe(titleFill);
  });

  it('uses IconAlternative, the same grey as TextAlternative, on form rows', () => {
    const formFill = pathFill(
      <SealPercentIcon size={16} color={IconColor.IconAlternative} />,
    );
    const textFill = pathFill(<FillProbe token={TextColor.TextAlternative} />);
    const titleFill = pathFill(<FillProbe token={TextColor.TextDefault} />);

    expect(formFill).toBe(textFill);
    expect(formFill).not.toBe(titleFill);
  });
});
