import { NavigationProp } from '@react-navigation/native';

class NavigationService {
  navigation?: NavigationProp<any>;

  setNavigationRef(navRef: NavigationProp<any>) {
    this.navigation = navRef;
  }
}

export default new NavigationService();
