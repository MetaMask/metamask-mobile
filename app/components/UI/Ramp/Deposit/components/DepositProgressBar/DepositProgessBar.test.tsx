import React from 'react';
import { render } from '@testing-library/react-native';
import DepositProgressBar from './DepositProgressBar';
import { mockTheme } from '../../../../../../util/theme';

const mockCompletedColor = mockTheme.colors.primary.default;
const mockCurrentColor = mockTheme.colors.success.default;
const mockTodoColor = mockTheme.colors.border.muted;

jest.mock('../../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      container: { flexDirection: 'row', paddingVertical: 12 },
      step: { height: 5, flex: 1, borderRadius: 10 },
      completedStep: { backgroundColor: mockCompletedColor },
      currentStep: { backgroundColor: mockCurrentColor },
      todoStep: { backgroundColor: mockTodoColor },
      stepGap: { marginRight: 10 },
    },
  })),
}));

describe('DepositProgressBar', () => {
  it('renders the correct number of steps', () => {
    const { getAllByTestId } = render(
      <DepositProgressBar steps={5} currentStep={2} />,
    );

    const steps = getAllByTestId(/deposit-progress-step-\d+/);
    expect(steps).toHaveLength(5);
  });

  it('applies the correct styles for completed, current, and todo steps', () => {
    const { getByTestId } = render(
      <DepositProgressBar steps={5} currentStep={2} />,
    );

    const step0 = getByTestId('deposit-progress-step-0');
    const step1 = getByTestId('deposit-progress-step-1');
    const step2 = getByTestId('deposit-progress-step-2');
    const step3 = getByTestId('deposit-progress-step-3');
    const step4 = getByTestId('deposit-progress-step-4');

    expect(JSON.stringify(step0.props.style)).toContain(
      `"backgroundColor":"${mockCompletedColor}"`,
    );
    expect(JSON.stringify(step1.props.style)).toContain(
      `"backgroundColor":"${mockCompletedColor}"`,
    );
    expect(JSON.stringify(step2.props.style)).toContain(
      `"backgroundColor":"${mockCurrentColor}"`,
    );
    expect(JSON.stringify(step3.props.style)).toContain(
      `"backgroundColor":"${mockTodoColor}"`,
    );
    expect(JSON.stringify(step4.props.style)).toContain(
      `"backgroundColor":"${mockTodoColor}"`,
    );
  });

  it('applies the gap correctly between steps', () => {
    const { getByTestId } = render(
      <DepositProgressBar steps={3} currentStep={1} />,
    );

    const step0 = getByTestId('deposit-progress-step-0');
    const step1 = getByTestId('deposit-progress-step-1');
    const step2 = getByTestId('deposit-progress-step-2');

    expect(JSON.stringify(step0.props.style)).toContain(`"marginRight":10`);
    expect(JSON.stringify(step1.props.style)).toContain(`"marginRight":10`);

    expect(JSON.stringify(step2.props.style)).not.toContain(`"marginRight":10`);
  });
});
