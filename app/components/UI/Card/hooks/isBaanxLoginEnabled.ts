import { useCardSDK } from '../sdk';

const useIsBaanxLoginEnabled = () => {
  const { sdk } = useCardSDK();

  if (!sdk) {
    return false;
  }

  return sdk.isBaanxLoginEnabled;
};

export default useIsBaanxLoginEnabled;
