import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import MarketingMomentsDeveloperOptionsSection, {
  PROFILE_ONBOARDING_MARKETING_MOMENT_TEST_ID,
} from './MarketingMomentsDeveloperOptionsSection';
import NavigationService from '../../../../core/NavigationService';
import Routes from '../../../../constants/navigation/Routes';

jest.mock('../../../../core/NavigationService', () => ({
  __esModule: true,
  default: { navigation: { navigate: jest.fn() } },
}));

describe('MarketingMomentsDeveloperOptionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens social profile onboarding from the profile onboarding button', () => {
    const { getByTestId } = renderWithProvider(
      <MarketingMomentsDeveloperOptionsSection />,
    );

    fireEvent.press(getByTestId(PROFILE_ONBOARDING_MARKETING_MOMENT_TEST_ID));

    expect(NavigationService.navigation?.navigate).toHaveBeenCalledWith(
      Routes.SOCIAL.PROFILE_ONBOARDING,
    );
  });
});
