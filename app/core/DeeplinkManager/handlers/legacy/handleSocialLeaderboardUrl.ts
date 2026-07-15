import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../NavigationService';

export const handleSocialLeaderboardUrl = () => {
  NavigationService.navigation.navigate(Routes.SOCIAL_LEADERBOARD.VIEW);
};
