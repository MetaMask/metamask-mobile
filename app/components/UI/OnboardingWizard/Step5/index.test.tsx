import React from 'react';
import Step5 from './';
import renderWithProvider from '../../../../util/test/renderWithProvider';

const coachmarkRef = {
  yourAccountRef: {
    current: {
      measure: jest.fn(),
    },
  },
};

const closeOnboardingWizard = jest.fn();
describe('Step5', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <Step5 coachmarkRef={coachmarkRef} onClose={closeOnboardingWizard} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
