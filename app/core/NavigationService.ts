import { NavigationProp } from '@react-navigation/native';

class NavigationService {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation?: NavigationProp<any>;

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setNavigationRef(navRef: NavigationProp<any>) {
    this.navigation = navRef;
  }
}

export default new NavigationService();
