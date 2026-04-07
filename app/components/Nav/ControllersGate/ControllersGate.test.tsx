import React from 'react';
// Jest accepts prefixing out-of-scope variables with `mock`
import { View as MockView } from 'react-native';
import { render, act } from '@testing-library/react-native';
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

    const { getByTestId } = render(
      <ControllersGate>{mockChildren}</ControllersGate>,
    );

    expect(getByTestId(MOCK_FOX_LOADER_ID)).toBeTruthy();
  });

  it('renders children when appServicesReady is true', () => {
    (useSelector as jest.Mock).mockReturnValue(true);

    const { getByTestId } = render(
      <ControllersGate>{mockChildren}</ControllersGate>,
    );

    expect(getByTestId(MOCK_CHILDREN_ID)).toBeTruthy();
  });

  it('renders FoxLoader overlay until animation completes', () => {
    (useSelector as jest.Mock).mockReturnValue(true);

    const { getByTestId } = render(
      <ControllersGate>{mockChildren}</ControllersGate>,
    );

    // FoxLoader overlay should still be present before onAnimationComplete fires
    expect(getByTestId(MOCK_FOX_LOADER_ID)).toBeTruthy();
    expect(getByTestId(MOCK_CHILDREN_ID)).toBeTruthy();
  });

  it('removes FoxLoader overlay after animation completes', () => {
    jest.useFakeTimers();
    (useSelector as jest.Mock).mockReturnValue(true);

    const { getByTestId, queryByTestId } = render(
      <ControllersGate>{mockChildren}</ControllersGate>,
    );

    act(() => {
      capturedOnAnimationComplete?.();
      jest.runAllTimers();
    });

    expect(queryByTestId(MOCK_FOX_LOADER_ID)).toBeNull();
    jest.useRealTimers();
  });
});
