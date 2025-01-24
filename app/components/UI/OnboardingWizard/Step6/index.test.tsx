import React from 'react';
import Step6 from './';
import renderWithProvider from '../../../../util/test/renderWithProvider';

const navigationMock = {
  navigate: jest.fn(),
};

const closeOnboardingWizard = jest.fn();
describe('Step6', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <Step6 navigation={navigationMock} onClose={closeOnboardingWizard} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
