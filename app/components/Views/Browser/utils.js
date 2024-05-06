import { getBrowserViewNavbarOptions } from '../../UI/Navbar';

const setNavOptions = (
  route,
  colors,
  handleRightTopButtonAnalyticsEvent,
  navigation,
) => {
  const options = {
    ...getBrowserViewNavbarOptions(
      route,
      colors,
      handleRightTopButtonAnalyticsEvent,
    ),
    headerShown: !(route.params?.showTabs ?? false),
  };

  return navigation.setOptions(options);
};

export default setNavOptions;
