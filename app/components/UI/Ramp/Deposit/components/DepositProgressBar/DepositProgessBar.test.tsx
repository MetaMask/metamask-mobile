import React from 'react';
import { render } from '@testing-library/react-native';
import DepositProgressBar from './DepositProgressBar';

const COMPLETED_COLOR = '#007BFF';
const CURRENT_COLOR = '#28A745';
const TODO_COLOR = '#E5E5E5';

jest.mock('../../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      container: { flexDirection: 'row', paddingVertical: 12 },
      step: { height: 5, flex: 1, borderRadius: 10 },
      completedStep: { backgroundColor: COMPLETED_COLOR },
      currentStep: { backgroundColor: CURRENT_COLOR },
      todoStep: { backgroundColor: TODO_COLOR },
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
      `"backgroundColor":"${COMPLETED_COLOR}"`,
    );
    expect(JSON.stringify(step1.props.style)).toContain(
      `"backgroundColor":"${COMPLETED_COLOR}"`,
    );
    expect(JSON.stringify(step2.props.style)).toContain(
      `"backgroundColor":"${CURRENT_COLOR}"`,
    );
    expect(JSON.stringify(step3.props.style)).toContain(
      `"backgroundColor":"${TODO_COLOR}"`,
    );
    expect(JSON.stringify(step4.props.style)).toContain(
      `"backgroundColor":"${TODO_COLOR}"`,
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
