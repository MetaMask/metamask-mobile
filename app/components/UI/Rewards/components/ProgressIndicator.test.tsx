import React from 'react';
import { StyleSheet, useColorScheme, ViewStyle } from 'react-native';
import { screen } from '@testing-library/react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import ProgressIndicator from './ProgressIndicator';
import renderWithProvider, {
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import { AppThemeKey } from '../../../../util/theme/models';

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  useColorScheme: jest.fn(),
}));

const mockUseColorScheme = jest.mocked(useColorScheme);

const CONTAINER_TEST_ID = 'progress-indicator-container';
const stepTestId = (index: number): string =>
  `progress-indicator-step-${index}`;

let tw: ReturnType<typeof useTailwind>;

const getTailwindStyle = (...classNames: string[]): ViewStyle =>
  tw.style(...classNames);

const getStepStyle = (index: number): ViewStyle =>
  StyleSheet.flatten(screen.getByTestId(stepTestId(index)).props.style);

const renderIndicator = (
  props: React.ComponentProps<typeof ProgressIndicator>,
  appTheme: AppThemeKey = AppThemeKey.light,
): ReturnType<typeof renderWithProvider> =>
  renderWithProvider(<ProgressIndicator {...props} />, {
    state: { user: { appTheme } },
  });

describe('ProgressIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseColorScheme.mockReturnValue('light');
    // Resolved before each render because renderHookWithProvider retargets `screen`.
    tw = renderHookWithProvider(() => useTailwind()).result.current;
  });

  describe('step count', () => {
    it.each(['bars', 'dots'] as const)(
      'renders one step per totalSteps for the %s variant',
      (variant) => {
        renderIndicator({ totalSteps: 5, currentStep: 3, variant });

        expect(screen.getByTestId(stepTestId(0))).toBeOnTheScreen();
        expect(screen.getByTestId(stepTestId(4))).toBeOnTheScreen();
        expect(screen.queryByTestId(stepTestId(5))).not.toBeOnTheScreen();
      },
    );

    it('renders the container without steps when totalSteps is 0', () => {
      renderIndicator({ totalSteps: 0, currentStep: 1 });

      expect(screen.getByTestId(CONTAINER_TEST_ID)).toBeOnTheScreen();
      expect(screen.queryByTestId(stepTestId(0))).not.toBeOnTheScreen();
    });
  });

  describe('bars variant', () => {
    it('uses the bars variant when no variant is given', () => {
      renderIndicator({ totalSteps: 4, currentStep: 2 });

      expect(getStepStyle(1)).toMatchObject(getTailwindStyle('w-[23px]'));
    });

    it('widens only the step matching the 1-based currentStep', () => {
      renderIndicator({ totalSteps: 4, currentStep: 2, variant: 'bars' });

      const activeStyle = getTailwindStyle('w-[23px]');
      const inactiveStyle = getTailwindStyle('w-[12px]');
      expect(getStepStyle(1)).toMatchObject(activeStyle);
      expect(getStepStyle(0)).toMatchObject(inactiveStyle);
      expect(getStepStyle(2)).toMatchObject(inactiveStyle);
      expect(getStepStyle(3)).toMatchObject(inactiveStyle);
    });

    it('highlights the first step when currentStep is 1', () => {
      renderIndicator({ totalSteps: 3, currentStep: 1, variant: 'bars' });

      expect(getStepStyle(0)).toMatchObject(getTailwindStyle('w-[23px]'));
      expect(getStepStyle(1)).toMatchObject(getTailwindStyle('w-[12px]'));
    });

    it('highlights the last step when currentStep equals totalSteps', () => {
      renderIndicator({ totalSteps: 3, currentStep: 3, variant: 'bars' });

      expect(getStepStyle(2)).toMatchObject(getTailwindStyle('w-[23px]'));
      expect(getStepStyle(0)).toMatchObject(getTailwindStyle('w-[12px]'));
    });

    it.each([0, 4])(
      'highlights no step when currentStep is %s of 3',
      (currentStep) => {
        renderIndicator({ totalSteps: 3, currentStep, variant: 'bars' });

        const inactiveStyle = getTailwindStyle('w-[12px]');
        expect(getStepStyle(0)).toMatchObject(inactiveStyle);
        expect(getStepStyle(1)).toMatchObject(inactiveStyle);
        expect(getStepStyle(2)).toMatchObject(inactiveStyle);
      },
    );
  });

  describe('dots variant', () => {
    it('keeps every dot the same size while recoloring the active one', () => {
      renderIndicator({ totalSteps: 3, currentStep: 2, variant: 'dots' });

      const dotSize = getTailwindStyle('w-[12px] h-[12px]');
      expect(getStepStyle(0)).toMatchObject(dotSize);
      expect(getStepStyle(1)).toMatchObject(dotSize);
      expect(getStepStyle(2)).toMatchObject(dotSize);
      expect(getStepStyle(1)).toMatchObject(getTailwindStyle('bg-black'));
      expect(getStepStyle(0)).toMatchObject(
        getTailwindStyle('bg-border-muted'),
      );
      expect(getStepStyle(2)).toMatchObject(
        getTailwindStyle('bg-border-muted'),
      );
    });
  });

  describe('active step color', () => {
    it.each(['bars', 'dots'] as const)(
      'uses a dark active step in the %s variant for the light app theme on a light OS',
      (variant) => {
        renderIndicator(
          { totalSteps: 3, currentStep: 2, variant },
          AppThemeKey.light,
        );

        expect(getStepStyle(1)).toMatchObject(getTailwindStyle('bg-black'));
      },
    );

    it.each(['bars', 'dots'] as const)(
      'uses a white active step in the %s variant for the dark app theme',
      (variant) => {
        renderIndicator(
          { totalSteps: 3, currentStep: 2, variant },
          AppThemeKey.dark,
        );

        expect(getStepStyle(1)).toMatchObject(getTailwindStyle('bg-white'));
      },
    );

    it('uses a white active step when the OS color scheme is dark', () => {
      mockUseColorScheme.mockReturnValue('dark');

      renderIndicator(
        { totalSteps: 3, currentStep: 2, variant: 'bars' },
        AppThemeKey.os,
      );

      expect(getStepStyle(1)).toMatchObject(getTailwindStyle('bg-white'));
    });

    it('uses a dark active step for the os app theme on a light OS', () => {
      renderIndicator(
        { totalSteps: 3, currentStep: 2, variant: 'bars' },
        AppThemeKey.os,
      );

      expect(getStepStyle(1)).toMatchObject(getTailwindStyle('bg-black'));
    });

    it('keeps inactive steps muted regardless of theme', () => {
      renderIndicator(
        { totalSteps: 3, currentStep: 2, variant: 'bars' },
        AppThemeKey.dark,
      );

      expect(getStepStyle(0)).toMatchObject(
        getTailwindStyle('bg-border-muted'),
      );
      expect(getStepStyle(2)).toMatchObject(
        getTailwindStyle('bg-border-muted'),
      );
    });
  });
});
