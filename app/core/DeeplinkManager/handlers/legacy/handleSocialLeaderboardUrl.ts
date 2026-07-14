import NavigationService from '../../../NavigationService';
import { navigateToSocialLeaderboard } from '../../../../components/Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';

export const handleSocialLeaderboardUrl = () => {
  navigateToSocialLeaderboard(NavigationService.navigation.navigate);
};
