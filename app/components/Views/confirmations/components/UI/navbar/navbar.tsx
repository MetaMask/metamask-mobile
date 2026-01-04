import React from 'react';
import HeaderCenter from '../../../../../../component-library/components-temp/HeaderCenter';

export function getNavbar({
  title,
  onReject,
  addBackButton = true,
}: {
  title: string;
  onReject?: () => void;
  addBackButton?: boolean;
}) {
  return {
    header: () => (
      <HeaderCenter
        title={title}
        onBack={addBackButton ? onReject : undefined}
        testID={`${title}-navbar`}
        includesTopInset
      />
    ),
  };
}

export function getEmptyNavHeader() {
  const navbarOptions = getNavbar({
    title: '',
    addBackButton: false,
  });
  return {
    ...navbarOptions,
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
