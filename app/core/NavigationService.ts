class NavigationService {
  navigation?: any;

  setNavigationRef(navRef: any) {
    this.navigation = navRef;
  }
}

export default new NavigationService();
