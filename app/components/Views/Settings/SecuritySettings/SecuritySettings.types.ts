export interface GatewayWithAvailability {
  key: string;
  value: string;
  label: string;
  available: boolean;
}

/**
 * Sections of the Security & Privacy settings screen that can be scrolled to
 * via navigation params (e.g. from the /privacy deeplink).
 */
export type SecuritySettingsScrollSection = 'metametrics' | 'data-collection';

export interface SecuritySettingsParams {
  scrollToSection?: SecuritySettingsScrollSection;
}

export interface EtherscanNetworksType {
  [key: string]: { domain: string; subdomain: string; networkId: string };
}
