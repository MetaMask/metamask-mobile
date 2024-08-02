import React from 'react';

import OnboardingWizard from './';
import renderWithProvider from '../../../util/test/renderWithProvider';

const navigationMock = {
  navigate: jest.fn(),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const coachmarkRef: React.RefObject<any> = {
  current: {
    yourAccountRef: {
      measure: jest.fn(),
    },
  },
};

describe('OnboardingWizard', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <OnboardingWizard
        navigation={navigationMock}
        coachmarkRef={coachmarkRef}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
