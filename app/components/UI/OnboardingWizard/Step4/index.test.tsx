import React from 'react';
import Step4 from './';
import renderWithProvider from '../../../../util/test/renderWithProvider';

const closeOnboardingWizard = jest.fn();
describe('Step4', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <Step4 onClose={closeOnboardingWizard} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
