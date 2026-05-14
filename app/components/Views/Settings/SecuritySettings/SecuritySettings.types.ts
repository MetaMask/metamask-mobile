import type { TextVariant } from '@metamask/design-system-react-native';

export interface GatewayWithAvailability {
  key: string;
  value: string;
  label: string;
  available: boolean;
}

export interface HeadingProps {
  first?: boolean;
  /** @default TextVariant.HeadingLg */
  textVariant?: TextVariant;
  children: React.ReactNode;
}

export interface SecuritySettingsParams {
  scrollToDetectNFTs?: boolean;
}

export interface EtherscanNetworksType {
  [key: string]: { domain: string; subdomain: string; networkId: string };
}
