import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import QuickBuyDisabledSection from './QuickBuyDisabledSection';

describe('QuickBuyDisabledSection', () => {
  it('renders children untouched when enabled', () => {
    render(
      <QuickBuyDisabledSection isDisabled={false}>
        <Text>child</Text>
      </QuickBuyDisabledSection>,
    );

    expect(screen.getByText('child')).toBeOnTheScreen();
    // No wrapper is introduced, so enabled layout is byte-for-byte unchanged.
    expect(screen.queryByTestId('quick-buy-disabled-section')).toBeNull();
  });

  it('blocks touches and dims the subtree when disabled', () => {
    render(
      <QuickBuyDisabledSection isDisabled>
        <Text>child</Text>
      </QuickBuyDisabledSection>,
    );

    const wrapper = screen.getByTestId('quick-buy-disabled-section');
    expect(wrapper.props.pointerEvents).toBe('none');
    expect(screen.getByText('child')).toBeOnTheScreen();
  });

  // The sheet wraps three disjoint regions (amount, footer rows, keypad), so a
  // caller-supplied id is what lets a test target one unambiguously.
  it('uses a caller-supplied testID when given', () => {
    render(
      <QuickBuyDisabledSection isDisabled testID="quick-buy-disabled-keypad">
        <Text>child</Text>
      </QuickBuyDisabledSection>,
    );

    expect(
      screen.getByTestId('quick-buy-disabled-keypad').props.pointerEvents,
    ).toBe('none');
    expect(screen.queryByTestId('quick-buy-disabled-section')).toBeNull();
  });

  // Dimmed rows still carry readable information (Pay with, Total). Hiding the
  // subtree wholesale would make the sheet read as empty to a screen reader, so
  // inertness is expressed via pointerEvents and per-control disabled props.
  it('keeps the disabled subtree readable by assistive technology', () => {
    render(
      <QuickBuyDisabledSection isDisabled>
        <Text>child</Text>
      </QuickBuyDisabledSection>,
    );

    const wrapper = screen.getByTestId('quick-buy-disabled-section');
    expect(wrapper.props.accessibilityElementsHidden).toBeUndefined();
    expect(wrapper.props.importantForAccessibility).toBeUndefined();
    expect(screen.getByText('child')).toBeOnTheScreen();
  });
});
