export interface AccountRightButtonProps {
  selectedAddress: string;
  onPress: () => void;
  /**
   * Optional active URL to derive hostname from.
   * When provided, this takes precedence over route.params?.url
   * This is needed for the browser fullscreen mode where route params may be stale.
   */
  activeUrl?: string;
}
