import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { AnimationDuration } from '@metamask/design-tokens';
import CrossfadeButton, { CROSSFADE_HALF_DURATION_MS } from './CrossfadeButton';

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => false),
}));
const mockUseReducedMotion = jest.mocked(useReducedMotion);

const BUTTON_TEST_ID = 'crossfade-button';
const mockOnPress = jest.fn();

const renderButton = (label: string, isDisabled = true) =>
  render(
    <CrossfadeButton
      label={label}
      isDisabled={isDisabled}
      onPress={mockOnPress}
      testID={BUTTON_TEST_ID}
    />,
  );

const rerenderButton = (
  rerender: ReturnType<typeof render>['rerender'],
  label: string,
  isDisabled = true,
) =>
  rerender(
    <CrossfadeButton
      label={label}
      isDisabled={isDisabled}
      onPress={mockOnPress}
      testID={BUTTON_TEST_ID}
    />,
  );

describe('CrossfadeButton', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockUseReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses the Quickly duration token for each half of the fade', () => {
    expect(CROSSFADE_HALF_DURATION_MS).toBe(AnimationDuration.Quickly);
  });

  it('leaves the disabled dimming to Button', () => {
    const { rerender } = renderButton('Agree to consent above');

    expect(
      StyleSheet.flatten(screen.getByTestId(BUTTON_TEST_ID).props.style),
    ).toMatchObject({ opacity: 0.5 });

    rerenderButton(rerender, 'Agree and continue', false);

    expect(
      StyleSheet.flatten(screen.getByTestId(BUTTON_TEST_ID).props.style),
    ).toMatchObject({ opacity: 1 });
  });

  it('shows the label as its text and accessible name', () => {
    renderButton('Scroll to continue');

    expect(screen.getByTestId(BUTTON_TEST_ID)).toHaveTextContent(
      'Scroll to continue',
      { exact: true },
    );
    expect(
      screen.getByRole('button', {
        name: 'Scroll to continue',
        disabled: true,
      }),
    ).toBeOnTheScreen();
  });

  it('keeps the old text while it fades out, then shows the new label', () => {
    const { rerender } = renderButton('Scroll to continue');

    rerenderButton(rerender, 'Agree to consent above');

    expect(screen.getByTestId(BUTTON_TEST_ID)).toHaveTextContent(
      'Scroll to continue',
      { exact: true },
    );

    act(() => {
      jest.advanceTimersByTime(CROSSFADE_HALF_DURATION_MS);
    });

    expect(screen.getByTestId(BUTTON_TEST_ID)).toHaveTextContent(
      'Agree to consent above',
      { exact: true },
    );
  });

  it('updates the accessible name and disabled state straight away', () => {
    const { rerender } = renderButton('Agree to consent above');

    rerenderButton(rerender, 'Agree and continue', false);

    expect(
      screen.getByRole('button', {
        name: 'Agree and continue',
        disabled: false,
      }),
    ).toBeOnTheScreen();
  });

  it('keeps the current text when the label changes back mid-fade', () => {
    const { rerender } = renderButton('Scroll to continue');

    rerenderButton(rerender, 'Agree to consent above');
    rerenderButton(rerender, 'Scroll to continue');
    act(() => {
      jest.advanceTimersByTime(CROSSFADE_HALF_DURATION_MS * 2);
    });

    expect(screen.getByTestId(BUTTON_TEST_ID)).toHaveTextContent(
      'Scroll to continue',
      { exact: true },
    );
  });

  it('switches the text instantly with Reduce Motion on', () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { rerender } = renderButton('Scroll to continue');

    rerenderButton(rerender, 'Agree to consent above');

    expect(screen.getByTestId(BUTTON_TEST_ID)).toHaveTextContent(
      'Agree to consent above',
      { exact: true },
    );
  });
});
