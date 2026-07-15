import NavigationService from '../NavigationService';
import Routes from '../../constants/navigation/Routes';
import { ConnectionInfo } from '../SDKConnectV2/types/connection-info';

export const showAgenticCliOtpCode = (
  conninfo: ConnectionInfo,
  otp: string,
  deadline: number,
): void => {
  NavigationService.navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
    screen: Routes.SHEET.SDK_CONNECT_V2_OTP,
    params: {
      otp,
      dappName: conninfo.metadata.dapp.name,
      deadline,
    },
  });
};

export const hideAgenticCliOtpCode = (_conninfo: ConnectionInfo): void => {
  const nav = NavigationService.navigation;
  const currentRoute = nav?.getCurrentRoute()?.name;

  if (currentRoute === Routes.SHEET.SDK_CONNECT_V2_OTP && nav?.canGoBack()) {
    nav.goBack();
  }
};
