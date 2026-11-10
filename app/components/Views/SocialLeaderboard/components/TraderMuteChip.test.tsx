import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { IconName, IconSize } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TraderMuteChip, { PROFILE_MUTE_CHIP_DIAMETER } from './TraderMuteChip';

const TEST_ID = 'mute-chip';

describe('TraderMuteChip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes a checked switch when the trader is not muted', () => {
    renderWithProvider(
      <TraderMuteChip isMuted={false} onPress={jest.fn()} testID={TEST_ID} />,
    );

    expect(screen.getByTestId(TEST_ID).props.accessibilityState.checked).toBe(
      true,
    );
  });

  it('exposes an unchecked switch when the trader is muted', () => {
    renderWithProvider(
      <TraderMuteChip isMuted onPress={jest.fn()} testID={TEST_ID} />,
    );

    expect(screen.getByTestId(TEST_ID).props.accessibilityState.checked).toBe(
      false,
    );
  });

  it('invokes onPress when tapped', () => {
    const onPress = jest.fn();
    renderWithProvider(
      <TraderMuteChip isMuted={false} onPress={onPress} testID={TEST_ID} />,
    );

    fireEvent.press(screen.getByTestId(TEST_ID));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('matches the large button height and stays circular', () => {
    renderWithProvider(
      <TraderMuteChip
        isMuted={false}
        onPress={jest.fn()}
        diameter={PROFILE_MUTE_CHIP_DIAMETER}
        testID={TEST_ID}
      />,
    );

    const style = StyleSheet.flatten(screen.getByTestId(TEST_ID).props.style);

    expect(style.width).toBe(PROFILE_MUTE_CHIP_DIAMETER);
    expect(style.height).toBe(PROFILE_MUTE_CHIP_DIAMETER);
    expect(style.borderRadius).toBeGreaterThanOrEqual(
      PROFILE_MUTE_CHIP_DIAMETER / 2,
    );
    expect(
      screen.UNSAFE_getByProps({ name: IconName.Notification }).props.size,
    ).toBe(IconSize.Lg);
  });

  it('weaves the trader name into the accessibility label', () => {
    renderWithProvider(
      <TraderMuteChip
        isMuted={false}
        onPress={jest.fn()}
        traderName="satoshi"
        testID={TEST_ID}
      />,
    );

    expect(screen.getByTestId(TEST_ID).props.accessibilityLabel).toContain(
      'satoshi',
    );
  });
});
