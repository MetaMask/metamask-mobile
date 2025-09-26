import { NetworkMenuModalState } from '../NetworkManager/index.types';

export interface NetworkMultiSelectorProps {
  openModal: (networkMenuModal: NetworkMenuModalState) => void;
  dismissModal?: () => void;
}
