import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { IconSize } from '@metamask/design-system-react-native';
import PendingSpinner from './PendingSpinner';

describe('PendingSpinner', () => {
  it('renders with the provided testID', () => {
    const { getByTestId } = render(<PendingSpinner testID="pending-spinner" />);

    expect(
      getByTestId('pending-spinner', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it('is hidden from assistive technology', () => {
    const { getByTestId } = render(<PendingSpinner testID="pending-spinner" />);

    const spinner = getByTestId('pending-spinner', {
      includeHiddenElements: true,
    });
    expect(spinner.props.accessibilityElementsHidden).toBe(true);
    expect(spinner.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('sizes the rotation container to the default icon size', () => {
    const { getByTestId } = render(<PendingSpinner testID="pending-spinner" />);

    const style = StyleSheet.flatten(
      getByTestId('pending-spinner', { includeHiddenElements: true }).props
        .style,
    );
    expect(style).toMatchObject({ width: 16, height: 16 });
  });

  it('sizes the rotation container to the requested icon size', () => {
    const { getByTestId } = render(
      <PendingSpinner size={IconSize.Lg} testID="pending-spinner" />,
    );

    const style = StyleSheet.flatten(
      getByTestId('pending-spinner', { includeHiddenElements: true }).props
        .style,
    );
    expect(style).toMatchObject({ width: 24, height: 24 });
  });
});
