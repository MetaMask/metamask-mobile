import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';

export function handleTrendingUrl() {
  NavigationService.navigation.navigate(Routes.TRENDING_VIEW);
}
