import React from 'react';
import Step2 from './';
import renderWithProvider from '../../../../util/test/renderWithProvider';

const coachmarkRef = {
  yourAccountRef: {
    current: {
      measure: jest.fn(),
    },
  },
};
const closeOnboardingWizard = jest.fn();
describe('Step2', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <Step2 coachmarkRef={coachmarkRef} onClose={closeOnboardingWizard} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
