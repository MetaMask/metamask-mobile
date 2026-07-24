import React from 'react';
import { render, renderHook, act } from '@testing-library/react-native';
import { PerpsMode } from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import {
  hidePerpsModeFlash,
  showPerpsModeFlash,
  usePerpsModeFlash,
} from '../../utils/perpsModeFlash';
import { PerpsModeFlashSelectorsIDs } from '../../Perps.testIds';
import PerpsModeFlashContainer from './PerpsModeFlashContainer';

describe('PerpsModeFlashContainer', () => {
  beforeEach(() => {
    hidePerpsModeFlash();
  });

  afterEach(() => {
    jest.useRealTimers();
    hidePerpsModeFlash();
  });

  it('renders nothing when no mode is set', () => {
    // Arrange - store cleared in beforeEach

    // Act
    const { queryByTestId } = render(<PerpsModeFlashContainer />);

    // Assert
    expect(queryByTestId(PerpsModeFlashSelectorsIDs.CONTAINER)).toBeNull();
  });

  it('renders the Lite mode title when flashing Lite', () => {
    // Arrange
    showPerpsModeFlash(PerpsMode.Lite);

    // Act
    const { getByTestId } = render(<PerpsModeFlashContainer />);

    // Assert
    expect(getByTestId(PerpsModeFlashSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(PerpsModeFlashSelectorsIDs.TITLE)).toHaveTextContent(
      strings('perps.mode.lite_transition_title'),
    );
  });

  it('renders the gradient Pro mode title when flashing Pro', () => {
    // Arrange
    showPerpsModeFlash(PerpsMode.Pro);

    // Act
    const { getByTestId } = render(<PerpsModeFlashContainer />);

    // Assert
    expect(getByTestId(PerpsModeFlashSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(PerpsModeFlashSelectorsIDs.TITLE)).toHaveTextContent(
      strings('perps.mode.pro_transition_title'),
    );
  });

  it('auto-dismisses the flash after the configured duration', () => {
    // Arrange
    jest.useFakeTimers();
    showPerpsModeFlash(PerpsMode.Pro);
    const probe = renderHook(() => usePerpsModeFlash());
    render(<PerpsModeFlashContainer durationMs={500} />);
    expect(probe.result.current).toBe(PerpsMode.Pro);

    // Act
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Assert
    expect(probe.result.current).toBeNull();
  });

  it('clears any lingering flash on unmount', () => {
    // Arrange
    showPerpsModeFlash(PerpsMode.Pro);
    const probe = renderHook(() => usePerpsModeFlash());
    const { unmount } = render(<PerpsModeFlashContainer />);
    expect(probe.result.current).toBe(PerpsMode.Pro);

    // Act
    act(() => {
      unmount();
    });

    // Assert
    expect(probe.result.current).toBeNull();
  });
});
