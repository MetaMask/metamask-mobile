import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import FloatingHeader from './FloatingHeader';
import { useFloatingHeaderInset } from './useFloatingHeaderInset';

const Screen = ({
  isEnabled,
  topInset,
}: {
  isEnabled: boolean;
  topInset?: number;
}) => {
  const { inset, onLayout } = useFloatingHeaderInset(isEnabled, topInset);
  return (
    <FloatingHeader onLayout={onLayout} testID="header">
      <Text testID="inset">{inset}</Text>
    </FloatingHeader>
  );
};

const layout = (height: number) => ({ nativeEvent: { layout: { height } } });

describe('useFloatingHeaderInset', () => {
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
