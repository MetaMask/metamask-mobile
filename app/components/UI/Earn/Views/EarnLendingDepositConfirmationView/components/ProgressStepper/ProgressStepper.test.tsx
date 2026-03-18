import React from 'react';
import ProgressStepper, {
  PROGRESS_STEPPER_TEST_IDS,
  ProgressStepperProps,
} from '.';
import { strings } from '../../../../../../../../locales/i18n';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';

describe('ProgressStepper', () => {
  const defaultProps: ProgressStepperProps = {
    activeStep: 0,
    steps: [
      {
        label: strings('earn.approve'),
        isLoading: false,
      },
      {
        label: strings('earn.deposit'),
        isLoading: false,
      },
    ],
  };

  const getProps = ({
    activeStep = defaultProps.activeStep,
    steps = defaultProps.steps,
  }: Partial<ProgressStepperProps> = {}) => ({
    activeStep,
    steps,
  });

  it('renders correctly', () => {
    const component = renderWithProvider(
      <ProgressStepper {...defaultProps} />,
    );
    const { getByText } = component;

    expect(component).toMatchSnapshot();
    expect(getByText(strings('earn.approve'))).toBeDefined();
    expect(getByText(strings('earn.deposit'))).toBeDefined();
  });

  it('renders first step pending state when active step is 0', () => {
    const firstStepPendingProps = getProps({ activeStep: 0 });

    const component = renderWithProvider(
      <ProgressStepper {...firstStepPendingProps} />,
    );
    const { queryAllByTestId, queryByTestId } = component;

    const progressBar = queryByTestId(PROGRESS_STEPPER_TEST_IDS.PROGRESS_BAR);

    // Progress Bar Length
    expect(progressBar?.props?.x2).toBe(250);

    // Progress Bar Icons. Step 1 pending.
    expect(
      queryAllByTestId(PROGRESS_STEPPER_TEST_IDS.STEP_ICON.PENDING).length,
    ).toBe(2);
    expect(
      queryAllByTestId(PROGRESS_STEPPER_TEST_IDS.STEP_ICON.LOADING).length,
    ).toBe(0);
    expect(
      queryAllByTestId(PROGRESS_STEPPER_TEST_IDS.STEP_ICON.COMPLETED).length,
    ).toBe(0);

    expect(component).toMatchSnapshot();
  });

  it('renders first step complete and second step pending state when active step is 1', () => {
    const firstStepPendingProps = getProps({ activeStep: 1 });

    const component = renderWithProvider(
      <ProgressStepper {...firstStepPendingProps} />,
    );
    const { queryAllByTestId, queryByTestId } = component;

    const progressBar = queryByTestId(PROGRESS_STEPPER_TEST_IDS.PROGRESS_BAR);

    // Progress Bar Length
    expect(progressBar?.props?.x2).toBe(500);

    // Progress Bar Icons. Step 1 complete, Step 2 pending
    expect(
      queryAllByTestId(PROGRESS_STEPPER_TEST_IDS.STEP_ICON.PENDING).length,
    ).toBe(1);
    expect(
      queryAllByTestId(PROGRESS_STEPPER_TEST_IDS.STEP_ICON.LOADING).length,
    ).toBe(0);
    expect(
      queryAllByTestId(PROGRESS_STEPPER_TEST_IDS.STEP_ICON.COMPLETED).length,
    ).toBe(1);

    expect(component).toMatchSnapshot();
  });

  it('renders first and second step complete state when active step is 2', () => {
    const firstStepPendingProps = getProps({ activeStep: 2 });

    const component = renderWithProvider(
      <ProgressStepper {...firstStepPendingProps} />,
    );
    const { queryAllByTestId, queryByTestId } = component;

    const progressBar = queryByTestId(PROGRESS_STEPPER_TEST_IDS.PROGRESS_BAR);

    // Progress Bar Length
    expect(progressBar?.props?.x2).toBe(750);

    // Progress Bar Icons. Step 1 complete, Step 2 pending
    expect(
      queryAllByTestId(PROGRESS_STEPPER_TEST_IDS.STEP_ICON.PENDING).length,
    ).toBe(0);
    expect(
      queryAllByTestId(PROGRESS_STEPPER_TEST_IDS.STEP_ICON.LOADING).length,
    ).toBe(0);
    expect(
      queryAllByTestId(PROGRESS_STEPPER_TEST_IDS.STEP_ICON.COMPLETED).length,
    ).toBe(2);

    expect(component).toMatchSnapshot();
  });

  it('renders first step loading when isLoading prop set to true for firt step', () => {
    const firstStepLoading = { ...defaultProps.steps[0], isLoading: true };
    const secondStep = defaultProps.steps[1];

    const firstStepPendingProps = getProps({
      activeStep: 0,
      steps: [firstStepLoading, secondStep],
    });

    const component = renderWithProvider(
      <ProgressStepper {...firstStepPendingProps} />,
    );
    const { queryAllByTestId, queryByTestId } = component;

    const progressBar = queryByTestId(PROGRESS_STEPPER_TEST_IDS.PROGRESS_BAR);

    // Progress Bar Length
    expect(progressBar?.props?.x2).toBe(250);

    // Progress Bar Icons. Step 1 loading, Step 2 pending
    expect(
      queryAllByTestId(PROGRESS_STEPPER_TEST_IDS.STEP_ICON.PENDING).length,
    ).toBe(1);
    expect(
      queryAllByTestId(PROGRESS_STEPPER_TEST_IDS.STEP_ICON.LOADING).length,
    ).toBe(1);
    expect(
      queryAllByTestId(PROGRESS_STEPPER_TEST_IDS.STEP_ICON.COMPLETED).length,
    ).toBe(0);

    expect(component).toMatchSnapshot();
  });
});
