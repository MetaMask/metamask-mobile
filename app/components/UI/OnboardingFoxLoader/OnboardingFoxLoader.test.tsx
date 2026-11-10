import React, { createRef } from 'react';
import { render } from '@testing-library/react-native';
import { brandColor } from '@metamask/design-tokens';
import { colors } from '../../../styles/common';
import { mockTheme } from '../../../util/theme';
import { AppThemeKey } from '../../../util/theme/models';
import OnboardingFoxLoader, {
  getOnboardingFoxLoaderBackgroundColor,
  type OnboardingFoxLoaderRef,
} from './OnboardingFoxLoader';

const mockUseRiveMethods = {
  pause: jest.fn(),
  triggerInput: jest.fn(),
};
const mockUseTheme = jest.fn().mockReturnValue(mockTheme);

jest.mock('@rive-app/react-native', () => {
  const actual = jest.requireActual('../../../__mocks__/rive-app-react-native');
  return {
    ...actual,
    useRive: () => ({
      riveRef: { current: mockUseRiveMethods },
      riveViewRef: mockUseRiveMethods,
      setHybridRef: { f: jest.fn() },
    }),
  };
});

jest.mock('../../../util/theme', () => {
  const actual = jest.requireActual('../../../util/theme');
  return {
    ...actual,
    useTheme: () => mockUseTheme(),
  };
});

jest.mock('../../../animations/fox_loading.riv', () => 'mock-rive-file');

jest.mock('../../../util/onboarding', () => ({
  getScreenDimensions: () => ({
    screenWidth: 375,
    screenHeight: 812,
    animationHeight: 406,
  }),
}));

describe('OnboardingFoxLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue(mockTheme);
  });

  it('centers the fox without an activity indicator', () => {
    const { getByTestId, toJSON } = render(<OnboardingFoxLoader />);

    expect(getByTestId('fox-rive-loader-animation')).toHaveStyle({
      alignItems: 'center',
      justifyContent: 'center',
    });
    expect(JSON.stringify(toJSON())).not.toContain('ActivityIndicator');
  });

  it('uses the cream onboarding background in light mode', () => {
    const backgroundColor = getOnboardingFoxLoaderBackgroundColor(
      AppThemeKey.light,
    );

    expect(backgroundColor).toBe(
      colors.gettingStartedPageBackgroundColorLightMode,
    );
  });

  it('uses a black background in dark mode', () => {
    const backgroundColor = getOnboardingFoxLoaderBackgroundColor(
      AppThemeKey.dark,
    );

    expect(backgroundColor).toBe(brandColor.black);
  });

  it('fires the loader animation trigger when the Rive view is ready', () => {
    render(<OnboardingFoxLoader />);

    expect(mockUseRiveMethods.triggerInput).toHaveBeenCalledWith('Loader2');
  });

  it('forwards stop to the Rive pause method', () => {
    const ref = createRef<OnboardingFoxLoaderRef>();
    render(<OnboardingFoxLoader ref={ref} />);

    ref.current?.stop();

    expect(mockUseRiveMethods.pause).toHaveBeenCalledTimes(1);
  });
});
