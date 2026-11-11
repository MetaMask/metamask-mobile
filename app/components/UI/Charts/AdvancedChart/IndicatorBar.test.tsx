import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { GlassView } from 'expo-glass-effect';
import IndicatorBar from './IndicatorBar';

// The glass tests need the OS to draw glass, which Jest can't.
jest.mock('../../../../component-library/hooks/useLiquidGlass', () => {
  const actual = jest.requireActual(
    '../../../../component-library/hooks/useLiquidGlass',
  );
  return {
    ...actual,
    useLiquidGlass: () => ({
      ...actual.useLiquidGlass(),
      isGlassEnabled: true,
    }),
  };
});

describe('IndicatorBar', () => {
  it('draws the bordered bar by default', () => {
    const { getByLabelText, UNSAFE_queryAllByType } = render(<IndicatorBar />);

    expect(getByLabelText('MA')).toBeOnTheScreen();
    expect(UNSAFE_queryAllByType(GlassView)).toHaveLength(0);
  });

  it('draws the bar as one glass pill when isGlass is set', () => {
    const { UNSAFE_getAllByType } = render(<IndicatorBar isGlass />);

    expect(UNSAFE_getAllByType(GlassView)).toHaveLength(1);
  });

  it('keeps the MA menu and indicator toggles pressable on glass', () => {
    const onMAPress = jest.fn();
    const onIndicatorToggle = jest.fn();
    const { getByLabelText } = render(
      <IndicatorBar
        isGlass
        onMAPress={onMAPress}
        onIndicatorToggle={onIndicatorToggle}
      />,
    );

    fireEvent.press(getByLabelText('MA'));
    fireEvent.press(getByLabelText('RSI'));

    expect(onMAPress).toHaveBeenCalledTimes(1);
    expect(onIndicatorToggle).toHaveBeenCalledWith('RSI');
  });
});
