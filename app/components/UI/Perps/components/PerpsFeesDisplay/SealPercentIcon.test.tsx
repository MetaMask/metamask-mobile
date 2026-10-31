import { IconColor } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { render } from '@testing-library/react-native';
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import SealPercentIcon from './SealPercentIcon';

const FillProbe = ({ token }: { token: string }) => {
  const tw = useTailwind();

  return <Path testID="fill-probe" fill={tw.color(token)} />;
};

const tokenColor = (token: string) => {
  const { UNSAFE_getByType } = render(<FillProbe token={token} />);
  return UNSAFE_getByType(Path).props.fill;
};

const sealStyleColor = (icon: React.ReactElement) => {
  const { UNSAFE_getByType } = render(icon);
  return UNSAFE_getByType(Svg).props.color;
};

describe('SealPercentIcon', () => {
  it('uses IconDefault for the fees-sheet title treatment', () => {
    const defaultColor = sealStyleColor(<SealPercentIcon size={24} />);
    const defaultTokenColor = tokenColor(IconColor.IconDefault);

    expect(defaultColor).toBe(defaultTokenColor);
  });

  it('paints form rows with IconAlternative through currentColor, like the info icon', () => {
    const { UNSAFE_getByType } = render(
      <SealPercentIcon size={16} color={IconColor.IconAlternative} />,
    );
    const svg = UNSAFE_getByType(Svg);
    const path = UNSAFE_getByType(Path);
    const formColor = svg.props.color;
    const alternativeTokenColor = tokenColor(IconColor.IconAlternative);
    const defaultTokenColor = tokenColor(IconColor.IconDefault);

    expect(svg.props.fill).toBe('currentColor');
    expect(path.props.fill).toBeUndefined();
    expect(formColor).toBe(alternativeTokenColor);
    expect(formColor).not.toBe(defaultTokenColor);
  });
});
