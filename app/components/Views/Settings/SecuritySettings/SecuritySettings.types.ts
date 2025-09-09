export interface GatewayWithAvailability {
  key: string;
  value: string;
  label: string;
  available: boolean;
}

export interface HeadingProps {
  first?: boolean;
  children: React.ReactNode;
}

export type SecuritySettingsParams = {
  scrollToDetectNFTs?: boolean;
};

export interface EtherscanNetworksType {
  [key: string]: { domain: string; subdomain: string; networkId: string };
}
