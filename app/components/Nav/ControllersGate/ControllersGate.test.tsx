import React from 'react';
// Jest accepts prefixing out-of-scope variables with `mock`
import { View as MockView } from 'react-native';
import { render, act, screen } from '@testing-library/react-native';
import ControllersGate from './ControllersGate';
import { useSelector } from 'react-redux';

const MOCK_FOX_LOADER_ID = 'FOX_LOADER_ID';
const MOCK_CHILDREN_ID = 'MOCK_CHILDREN_ID';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockIsE2E = false;
jest.mock('../../../util/test/utils', () => ({
  get isE2E() {
    return mockIsE2E;
  },
}));

// Capture onAnimationComplete directly so tests can trigger it without hiding
// the real prop signature behind a native event like onLayout.
let capturedOnAnimationComplete: (() => void) | undefined;

jest.mock(
  '../../UI/FoxLoader',
  () =>
    function MockFoxLoader({
      onAnimationComplete,
    }: {
      appServicesReady: boolean;
      onAnimationComplete: () => void;
    }) {
      capturedOnAnimationComplete = onAnimationComplete;
      return <MockView testID={MOCK_FOX_LOADER_ID}>Fox Loader</MockView>;
    },
);

describe('ControllersGate', () => {
  const mockChildren = (
    <MockView testID={MOCK_CHILDREN_ID}>Test Children</MockView>
  );

  beforeEach(() => {
    capturedOnAnimationComplete = undefined;
  });

  it('renders FoxLoader when appServicesReady is false', () => {
    (useSelector as jest.Mock).mockReturnValue(false);

    render(<ControllersGate>{mockChildren}</ControllersGate>);

    expect(screen.getByTestId(MOCK_FOX_LOADER_ID)).toBeOnTheScreen();
  });

  it('renders children when appServicesReady is true', () => {
    (useSelector as jest.Mock).mockReturnValue(true);

    render(<ControllersGate>{mockChildren}</ControllersGate>);

    expect(screen.getByTestId(MOCK_CHILDREN_ID)).toBeOnTheScreen();
  });

  it('renders FoxLoader overlay until animation completes', () => {
    (useSelector as jest.Mock).mockReturnValue(true);

    render(<ControllersGate>{mockChildren}</ControllersGate>);

    // FoxLoader overlay should still be present before onAnimationComplete fires
    expect(screen.getByTestId(MOCK_FOX_LOADER_ID)).toBeOnTheScreen();
    expect(screen.getByTestId(MOCK_CHILDREN_ID)).toBeOnTheScreen();
  });

  it('removes FoxLoader overlay after animation completes and services are ready', () => {
    jest.useFakeTimers();
    (useSelector as jest.Mock).mockReturnValue(true);

    render(<ControllersGate>{mockChildren}</ControllersGate>);

    // First act: fire onAnimationComplete → setAnimationDone(true) → useEffect schedules setTimeout
    act(() => {
      capturedOnAnimationComplete?.();
    });
    // Second act: advance past the setTimeout so fadeOutLoader runs
    act(() => {
      jest.runAllTimers();
    });

    expect(screen.queryByTestId(MOCK_FOX_LOADER_ID)).toBeNull();
    jest.useRealTimers();
  });

  it('keeps FoxLoader overlay when animation completes but services are not ready', () => {
    jest.useFakeTimers();
    (useSelector as jest.Mock).mockReturnValue(false);

    render(<ControllersGate>{mockChildren}</ControllersGate>);

    act(() => {
      capturedOnAnimationComplete?.();
    });
    act(() => {
      jest.runAllTimers();
    });

    // Overlay must remain — removing it now would show a blank screen
    expect(screen.getByTestId(MOCK_FOX_LOADER_ID)).toBeOnTheScreen();
    jest.useRealTimers();
  });
});
