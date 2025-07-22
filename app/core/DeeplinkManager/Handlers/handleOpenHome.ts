import NavigationService from '../../NavigationService';
import Routes from '../../../constants/navigation/Routes';

export function handleOpenHome() {
  NavigationService.navigation.navigate(Routes.WALLET.HOME);
}
