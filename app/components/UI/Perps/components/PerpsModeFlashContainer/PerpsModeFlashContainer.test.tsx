import React from 'react';
import { render, act } from '@testing-library/react-native';
import { PerpsMode } from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import { hidePerpsModeFlash } from '../../../../../core/redux/slices/perpsModeFlash';
import { PerpsModeFlashSelectorsIDs } from '../../Perps.testIds';
import PerpsModeFlashContainer from './PerpsModeFlashContainer';

// Controllable transient flash mode surfaced by the mocked selector.
let mockFlashMode: PerpsMode | null = null;
const mockDispatch = jest.fn();
const mockRunSelector = (selector: unknown) =>
  (
    selector as (arg: { perpsModeFlash: { mode: PerpsMode | null } }) => unknown
  )({
    perpsModeFlash: { mode: mockFlashMode },
  });

jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockRunSelector(selector),
  useDispatch: () => mockDispatch,
}));

describe('PerpsModeFlashContainer', () => {
  beforeEach(() => {
    mockFlashMode = null;
    mockDispatch.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when no mode is set', () => {
    // Arrange - default (no flash mode)

    // Act
    const { queryByTestId } = render(<PerpsModeFlashContainer />);

    // Assert
    expect(queryByTestId(PerpsModeFlashSelectorsIDs.CONTAINER)).toBeNull();
  });

  it('renders the Lite mode title when flashing Lite', () => {
    // Arrange
    mockFlashMode = PerpsMode.Lite;

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
    mockFlashMode = PerpsMode.Pro;

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
    mockFlashMode = PerpsMode.Pro;

    // Act
    render(<PerpsModeFlashContainer durationMs={500} />);
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Assert
    expect(mockDispatch).toHaveBeenCalledWith(hidePerpsModeFlash());
  });

  it('clears any lingering flash on unmount', () => {
    // Arrange
    mockFlashMode = PerpsMode.Pro;
    const { unmount } = render(<PerpsModeFlashContainer />);
    mockDispatch.mockClear();

    // Act
    unmount();

    // Assert
    expect(mockDispatch).toHaveBeenCalledWith(hidePerpsModeFlash());
  });
});
