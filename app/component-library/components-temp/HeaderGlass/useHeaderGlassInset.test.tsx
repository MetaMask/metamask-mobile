import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import HeaderGlass from './HeaderGlass';
import { useHeaderGlassInset } from './useHeaderGlassInset';

const Screen = ({
  isEnabled,
  topInset,
}: {
  isEnabled: boolean;
  topInset?: number;
}) => {
  const { inset, onLayout } = useHeaderGlassInset(isEnabled, topInset);
  return (
    <HeaderGlass onLayout={onLayout} testID="header">
      <Text testID="inset">{inset}</Text>
    </HeaderGlass>
  );
};

const layout = (height: number) => ({ nativeEvent: { layout: { height } } });

describe('useHeaderGlassInset', () => {
  it('starts at the header min height plus the top inset', () => {
    const { getByTestId } = render(<Screen isEnabled topInset={47} />);

    expect(getByTestId('inset')).toHaveTextContent(String(47 + 56));
  });

  it('follows the measured header height', () => {
    const { getByTestId } = render(<Screen isEnabled />);

    fireEvent(getByTestId('header'), 'layout', layout(120));

    expect(getByTestId('inset')).toHaveTextContent('120');
  });

  it('insets nothing while disabled', () => {
    const { getByTestId } = render(<Screen isEnabled={false} topInset={47} />);

    fireEvent(getByTestId('header'), 'layout', layout(120));

    expect(getByTestId('inset')).toHaveTextContent('0');
  });
});
