export interface TabThumbnailProps {
  isActiveTab: boolean;
  tab: {
    url: string;
    id: number;
    image: string;
  };
  onClose: (tab: { url: string; id: number; image: string }) => void;
  onSwitch: (tab: { url: string; id: number; image: string }) => void;
}

export interface FooterNetworkInfo {
  networkName: string;
  networkImageSource: object;
}
