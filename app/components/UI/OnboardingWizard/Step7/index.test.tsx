import React from 'react';
import Step7 from './';
import renderWithProvider from '../../../../util/test/renderWithProvider';

const navigationMock = {
  navigate: jest.fn(),
};

const closeOnboardingWizard = jest.fn();
describe('Step7', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <Step7 navigation={navigationMock} onClose={closeOnboardingWizard} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
