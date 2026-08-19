import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { brandColor, darkTheme } from '@metamask/design-tokens';
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react-native';
import React from 'react';
import { type TextStyle, type ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ThemeContext } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import {
  getPerpsProPillGradientColors,
  PERPS_PRO_GOLD,
} from '../../constants/perpsModeColors';
import PerpsModeSwitchPill, {
  BORDER_WIDTH,
  GLOW_TOTAL_MS,
} from './PerpsModeSwitchPill';

const PILL_TEST_ID = 'mode-switch-pill';

const darkThemeContext = {
  colors: darkTheme.colors,
  themeAppearance: AppThemeKey.dark,
  typography: darkTheme.typography,
  shadows: darkTheme.shadows,
  brandColors: brandColor,
};

const renderPill = ({
  isPro = false,
  isDark = false,
  onSwitchRequest = jest.fn(),
}: {
  isPro?: boolean;
  isDark?: boolean;
  onSwitchRequest?: () => void;
} = {}) => {
  const pill = (
    <PerpsModeSwitchPill
      currentModeLabel={isPro ? 'Pro' : 'Lite'}
      isPro={isPro}
      onSwitchRequest={onSwitchRequest}
      accessibilityLabel="Currently active mode"
      accessibilityHint="Switches mode"
      testID={PILL_TEST_ID}
    />
  );

  const view = render(
    isDark ? (
      <ThemeContext.Provider value={darkThemeContext}>
        {pill}
      </ThemeContext.Provider>
    ) : (
      pill
    ),
  );

  return { ...view, onSwitchRequest };
};

/** Token colors resolved by the preset, so assertions stay theme-agnostic. */
const useTokenColors = () => {
  const { result } = renderHook(() => useTailwind());
  const tw = result.current;
  return {
    borderDefault: (tw.style('border-default') as ViewStyle).borderColor,
    textDefault: (tw.style('text-default') as TextStyle).color,
  };
};

describe('PerpsModeSwitchPill', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('outlines the Lite pill with the default border and text tokens', () => {
    const { borderDefault, textDefault } = useTokenColors();

    renderPill();

    expect(screen.getByTestId(PILL_TEST_ID)).toHaveStyle({
      borderColor: borderDefault,
    });
    expect(screen.getByText('Lite')).toHaveStyle({ color: textDefault });
  });

  it('outlines the Pro pill with the Perps gold accent', () => {
    renderPill({ isPro: true });

    expect(screen.getByTestId(PILL_TEST_ID)).toHaveStyle({
      borderColor: PERPS_PRO_GOLD,
    });
  });

  it.each([
    ['Lite', false],
    ['Pro', true],
  ])('outlines the %s pill at the 2px spec thickness', (_label, isPro) => {
    renderPill({ isPro });

    expect(BORDER_WIDTH).toBe(2);
    expect(screen.getByTestId(PILL_TEST_ID)).toHaveStyle({
      borderWidth: BORDER_WIDTH,
    });
  });

  it.each([
    ['light', false],
    ['dark', true],
  ])('fills the Pro label with the %s-theme gold gradient', (_name, isDark) => {
    const { UNSAFE_getAllByType } = renderPill({ isPro: true, isDark });

    const gradients = UNSAFE_getAllByType(LinearGradient);

    expect(gradients[0].props.colors).toEqual(
      getPerpsProPillGradientColors(isDark),
    );
  });

  it('leaves the pill unfilled by a gradient in Lite mode', () => {
    const { UNSAFE_queryAllByType } = renderPill();

    expect(UNSAFE_queryAllByType(LinearGradient)).toHaveLength(0);
  });

  it('still defers the mode switch until the glow animation finishes', async () => {
    jest.useFakeTimers();
    const { onSwitchRequest } = renderPill({ isPro: true });

    fireEvent.press(screen.getByTestId(PILL_TEST_ID));

    expect(onSwitchRequest).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(GLOW_TOTAL_MS);
    });

    expect(onSwitchRequest).toHaveBeenCalledTimes(1);
  });
});
