export interface GatewayWithAvailability {
  key: string;
  value: string;
  label: string;
  available: boolean;
}

export interface SecuritySettingsParams {
  scrollToDetectNFTs?: boolean;
}

export interface EtherscanNetworksType {
  [key: string]: { domain: string; subdomain: string; networkId: string };
}
