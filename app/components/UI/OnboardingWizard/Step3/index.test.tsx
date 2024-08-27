import React from 'react';
import Step3 from './';
import renderWithProvider from '../../../../util/test/renderWithProvider';

const coachmarkRef = {
  yourAccountRef: {
    current: {
      measure: jest.fn(),
    },
  },
};
const closeOnboardingWizard = jest.fn();
describe('Step3', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <Step3 coachmarkRef={coachmarkRef} onClose={closeOnboardingWizard} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
