export interface TabThumbnailProps {
  isActiveTab: boolean;
  tab: {
    url: string;
    id: number;
    image: string;
  };
  onClose: (id: string) => void;
  onSwitch: (id: string) => void;
}
