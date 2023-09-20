export interface Gateway {
  key: number;
  value: string;
  label: string;
}
export interface GatewayWithAvailability {
  key: string;
  value: string;
  label: string;
  available: boolean;
}

export interface HeadingProps {
  first?: boolean;
  children: React.FC;
}

export interface SecuritySettingsParams {
  scrollToDetectNFTs?: boolean;
}
