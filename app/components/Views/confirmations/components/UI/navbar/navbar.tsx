import getHeaderCompactStandardNavbarOptions from '../../../../../../component-library/components-temp/HeaderCompactStandard/getHeaderCompactStandardNavbarOptions';

export interface NavbarOptions {
  title: string;
  onReject?: () => void;
  addBackButton?: boolean;
}

export function getNavbar({
  title,
  onReject,
  addBackButton = true,
}: NavbarOptions) {
  return getHeaderCompactStandardNavbarOptions({
    title,
    onBack: addBackButton ? onReject : undefined,
    includesTopInset: true,
  });
}

export function getEmptyNavHeader() {
  return {
    ...getNavbar({
      title: '',
      addBackButton: false,
    }),
    headerShown: true,
    gestureEnabled: false,
  };
}

export function getModalNavigationOptions() {
  return {
    title: '',
    headerLeft: () => null,
    headerTransparent: true,
    headerRight: () => null,
  };
}
