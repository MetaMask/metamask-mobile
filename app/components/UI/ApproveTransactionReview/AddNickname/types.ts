export interface AddNicknameProps {
  closeModal: () => void;
  address: string;
  addressNickname: string;
  nicknameExists: boolean;
  showModalAlert: (config: any) => void;
  networkState: {
    provider: {
      type: string;
    };
    network: number;
  };
}
