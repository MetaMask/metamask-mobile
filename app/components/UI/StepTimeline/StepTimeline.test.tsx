import React from 'react';
import { render } from '@testing-library/react-native';
import { StepConnector, StepDot, type StepDotStatus } from './StepTimeline';

describe('StepDot', () => {
  it.each<StepDotStatus>(['success', 'error', 'warning', 'muted'])(
    'renders a dot for %s status',
    (status) => {
      const { getByTestId } = render(
        <StepDot status={status} testID={`step-dot-${status}`} />,
      );

      expect(getByTestId(`step-dot-${status}`)).toBeOnTheScreen();
    },
  );
});

describe('StepConnector', () => {
  it('renders the dotted connector', () => {
    const { getByTestId } = render(<StepConnector testID="step-connector" />);

    expect(getByTestId('step-connector')).toBeOnTheScreen();
    expect(getByTestId('step-connector').children).toHaveLength(6);
  });
});
