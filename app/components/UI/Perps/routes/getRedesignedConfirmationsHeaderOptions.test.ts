import React from 'react';
import { render, screen } from '@testing-library/react-native';
import type { Position } from '@metamask/perps-controller';
import {
  getAdjustMarginOptions,
  getRedesignedConfirmationsHeaderOptions,
  PerpsAdjustMarginRouter,
  shouldRenderPerpsConfirmationLoader,
} from './index';

const mockUseRoute = jest.fn();
const mockSetOptions = jest.fn();
const mockScreenVsBottomSheetAbTest = { useBottomSheet: false };

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ setOptions: mockSetOptions }),
  useRoute: () => mockUseRoute(),
}));

jest.mock('../hooks/usePerpsScreenVsBottomSheetAbTest', () => ({
  usePerpsScreenVsBottomSheetAbTest: () => mockScreenVsBottomSheetAbTest,
}));

jest.mock('../components/PerpsAdjustMarginBottomSheet', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return ({
    position,
    initialMode,
  }: {
    position: Position;
    initialMode: 'add' | 'remove';
  }) =>
    ReactActual.createElement(View, {
      testID: 'adjust-margin-bottom-sheet',
      accessibilityLabel: `${position.symbol}-${initialMode}`,
    });
});

jest.mock('../Views/PerpsAdjustMarginView/PerpsAdjustMarginView', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return () =>
    ReactActual.createElement(View, { testID: 'adjust-margin-screen' });
});

describe('getRedesignedConfirmationsHeaderOptions', () => {
  it('returns push-style options without modal presentation when showPerpsHeader is false', () => {
    const options = getRedesignedConfirmationsHeaderOptions({
      showPerpsHeader: false,
    });

    expect(options.headerShown).toBe(false);
    expect(options.headerBackVisible).toBe(false);
    expect(options).not.toHaveProperty('presentation');
    expect(options.contentStyle).toBeUndefined();
  });

  it('returns header-visible options when showPerpsHeader is true', () => {
    const options = getRedesignedConfirmationsHeaderOptions({
      showPerpsHeader: true,
    });

    expect(options.headerShown).toBe(true);
    expect(options.headerBackVisible).toBe(false);
    expect(options).not.toHaveProperty('presentation');
  });

  it('uses transparent modal presentation for the bottom-sheet treatment', () => {
    const options = getRedesignedConfirmationsHeaderOptions({
      useBottomSheet: true,
      showPerpsHeader: false,
    });

    expect(options).toEqual(
      expect.objectContaining({
        presentation: 'transparentModal',
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: 'transparent' },
      }),
    );
  });

  it('defaults to showing perps header when no params provided', () => {
    const options = getRedesignedConfirmationsHeaderOptions();

    expect(options.headerShown).toBe(true);
  });
});

describe('shouldRenderPerpsConfirmationLoader', () => {
  it('renders the existing confirmation loader while a sheet approval is pending', () => {
    expect(shouldRenderPerpsConfirmationLoader(true, undefined)).toBe(true);
  });

  it('does not render the loader after the sheet approval attaches', () => {
    expect(shouldRenderPerpsConfirmationLoader(true, {})).toBe(false);
  });

  it('does not change the control confirmation path', () => {
    expect(shouldRenderPerpsConfirmationLoader(false, undefined)).toBe(false);
  });
});

describe('getAdjustMarginOptions', () => {
  it('uses full-screen options for the control presentation', () => {
    expect(getAdjustMarginOptions(false)).toEqual({
      title: 'Adjust Margin',
      headerShown: false,
    });
  });

  it('uses transparent modal options for the bottom-sheet presentation', () => {
    expect(getAdjustMarginOptions(true)).toEqual(
      expect.objectContaining({
        title: '',
        presentation: 'transparentModal',
      }),
    );
  });
});

describe('PerpsAdjustMarginRouter', () => {
  const position = { symbol: 'ETH' } as Position;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the existing screen for the control assignment', () => {
    mockScreenVsBottomSheetAbTest.useBottomSheet = false;
    mockUseRoute.mockReturnValue({
      params: { position, mode: 'add', useBottomSheet: true },
    });

    render(React.createElement(PerpsAdjustMarginRouter));

    expect(screen.getByTestId('adjust-margin-screen')).toBeOnTheScreen();
    expect(
      screen.queryByTestId('adjust-margin-bottom-sheet'),
    ).not.toBeOnTheScreen();
    expect(mockSetOptions).toHaveBeenCalledWith({
      title: 'Adjust Margin',
      headerShown: false,
    });
  });

  it('renders the bottom sheet for the treatment assignment', () => {
    mockScreenVsBottomSheetAbTest.useBottomSheet = true;
    mockUseRoute.mockReturnValue({
      params: {
        position,
        mode: 'remove',
        enableHaptics: true,
      },
    });

    render(React.createElement(PerpsAdjustMarginRouter));

    expect(screen.getByTestId('adjust-margin-bottom-sheet')).toHaveProp(
      'accessibilityLabel',
      'ETH-remove',
    );
    expect(screen.queryByTestId('adjust-margin-screen')).not.toBeOnTheScreen();
    expect(mockSetOptions).toHaveBeenCalledWith(
      expect.objectContaining({ presentation: 'transparentModal' }),
    );
  });

  it.each([
    { mode: 'add' as const, useBottomSheet: true },
    { position, useBottomSheet: true },
  ])(
    'falls back to the existing screen when treatment route params are incomplete',
    (params) => {
      mockScreenVsBottomSheetAbTest.useBottomSheet = true;
      mockUseRoute.mockReturnValue({ params });

      render(React.createElement(PerpsAdjustMarginRouter));

      expect(screen.getByTestId('adjust-margin-screen')).toBeOnTheScreen();
      expect(
        screen.queryByTestId('adjust-margin-bottom-sheet'),
      ).not.toBeOnTheScreen();
    },
  );
});
