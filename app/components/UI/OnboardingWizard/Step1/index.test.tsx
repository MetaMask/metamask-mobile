import React from 'react';
import Step1 from './';
import renderWithProvider from '../../../../util/test/renderWithProvider';

const closeOnboardingWizard = jest.fn();

describe('Step1', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <Step1 onClose={closeOnboardingWizard} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
