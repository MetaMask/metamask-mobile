import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import {
  RiveErrorType,
  __fireRiveViewError,
  __resetRiveMocks,
} from '../../../../../__mocks__/rive-app-react-native';
import {
  useNetworkTier,
  type NetworkTier,
} from '../../../../../hooks/useNetworkTier';
import Logger from '../../../../../util/Logger';
import {
  getHardwareTier,
  type HardwareTier,
} from '../../../../../util/deviceCapability';
import { useReduceMotion } from '../../../Money/hooks/useReduceMotion';
import VbaFoxLoader, {
  VbaFoxLoaderSelectorsIDs,
  shouldPlayVbaFoxLoader,
} from './VbaFoxLoader';

const mockUseRiveFile = jest.fn();
const mockRiveView = jest.fn();

jest.mock('@rive-app/react-native', () => {
  const ReactActual = jest.requireActual('react');
  const actual = jest.requireActual(
    '../../../../../__mocks__/rive-app-react-native',
  );
  return {
    ...actual,
    useRiveFile: (...args: unknown[]) => mockUseRiveFile(...args),
    RiveView: (props: Record<string, unknown>) => {
      mockRiveView(props);
      return ReactActual.createElement(actual.RiveView, props);
    },
  };
});

jest.mock(
  '../../../../../animations/loading_mm_fox.riv',
  () => 'loading-mm-fox',
);

jest.mock('../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(),
}));

jest.mock('../../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(),
}));

jest.mock('../../../Money/hooks/useReduceMotion', () => ({
  useReduceMotion: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUseNetworkTier = jest.mocked(useNetworkTier);
const mockGetHardwareTier = jest.mocked(getHardwareTier);
const mockUseReduceMotion = jest.mocked(useReduceMotion);

const loadedFile = () => ({
  riveFile: { __mockRiveFile: true },
  error: null,
  isLoading: false,
});

describe('shouldPlayVbaFoxLoader', () => {
  it.each([
    ['HIGH', 'WIFI', false, true],
    ['LOW', 'WIFI', false, true],
    ['LOW', null, false, true],
    [null, null, false, true],
    [null, 'NONE', false, false],
    ['HIGH', 'NONE', false, false],
    ['LOW', 'SLOW_CELLULAR', false, false],
    ['MID', 'SLOW_CELLULAR', false, true],
    ['HIGH', 'WIFI', true, false],
  ] as const)(
    'hardware %s network %s reduceMotion %s plays %s',
    (hardwareTier, networkTier, reduceMotion, plays) => {
      expect(
        shouldPlayVbaFoxLoader({
          hardwareTier: hardwareTier as HardwareTier | null,
          networkTier: networkTier as NetworkTier | null,
          reduceMotion,
        }),
      ).toBe(plays);
    },
  );
});

describe('VbaFoxLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetRiveMocks();
    mockUseRiveFile.mockReturnValue(loadedFile());
    mockGetHardwareTier.mockReturnValue('HIGH');
    mockUseNetworkTier.mockReturnValue('WIFI');
    mockUseReduceMotion.mockReturnValue(false);
  });

  it('plays the Loading artboard when the device can animate', () => {
    render(<VbaFoxLoader testID="vba-wait" />);

    expect(screen.getByTestId('vba-wait')).toBeOnTheScreen();
    expect(screen.getByLabelText('Loading')).toBeOnTheScreen();
    expect(
      screen.getByTestId(VbaFoxLoaderSelectorsIDs.ANIMATION),
    ).toBeOnTheScreen();
    expect(mockRiveView).toHaveBeenCalledWith(
      expect.objectContaining({
        artboardName: 'Loading',
        stateMachineName: 'State Machine 1',
        autoPlay: true,
        testID: VbaFoxLoaderSelectorsIDs.ANIMATION,
      }),
    );
    expect(
      screen.queryByTestId(VbaFoxLoaderSelectorsIDs.FALLBACK),
    ).not.toBeOnTheScreen();
  });

  it('keeps the indicator when Reduce Motion is on', () => {
    mockUseReduceMotion.mockReturnValue(true);

    render(<VbaFoxLoader />);

    expect(
      screen.getByTestId(VbaFoxLoaderSelectorsIDs.FALLBACK),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(VbaFoxLoaderSelectorsIDs.ANIMATION),
    ).not.toBeOnTheScreen();
  });

  it('keeps the indicator when the Rive file fails to load', () => {
    mockUseRiveFile.mockReturnValue({
      riveFile: null,
      error: { message: 'malformed', type: RiveErrorType.MalformedFile },
      isLoading: false,
    });

    render(<VbaFoxLoader />);

    expect(
      screen.getByTestId(VbaFoxLoaderSelectorsIDs.FALLBACK),
    ).toBeOnTheScreen();
  });

  it('switches to the indicator when the native view reports an error', () => {
    render(<VbaFoxLoader />);

    act(() => {
      __fireRiveViewError({
        message: 'missing artboard',
        type: RiveErrorType.IncorrectArtboardName,
      });
    });

    expect(Logger.error).toHaveBeenCalled();
    expect(
      screen.getByTestId(VbaFoxLoaderSelectorsIDs.FALLBACK),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(VbaFoxLoaderSelectorsIDs.ANIMATION),
    ).not.toBeOnTheScreen();
  });
});
