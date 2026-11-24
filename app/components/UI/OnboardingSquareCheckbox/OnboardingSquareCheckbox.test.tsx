import React from 'react';
import { render } from '@testing-library/react-native';
import OnboardingSquareCheckbox from './OnboardingSquareCheckbox';

describe('OnboardingSquareCheckbox', () => {
  it('announces the checked state and renders the check icon when checked', () => {
    const { getByRole } = render(<OnboardingSquareCheckbox isChecked />);

    const checkbox = getByRole('checkbox');
    expect(checkbox.props.accessibilityState.checked).toBe(true);
    expect(checkbox.children).toHaveLength(1);
  });

  it('announces the unchecked state and renders no icon when unchecked', () => {
    const { getByRole } = render(
      <OnboardingSquareCheckbox isChecked={false} />,
    );

    const checkbox = getByRole('checkbox');
    expect(checkbox.props.accessibilityState.checked).toBe(false);
    expect(checkbox.children).toHaveLength(0);
  });
});
