import { NativeTransakUserDetails } from '@consensys/native-ramps-sdk';
import { useDepositSdkMethod } from './useDepositSdkMethod';

const useDepositUser = (): {
  userDetails: NativeTransakUserDetails | null;
  error: string | null;
  isFetching: boolean;
} => {
  const [{ data, error, isFetching }] = useDepositSdkMethod('getUserDetails');
  return {
    userDetails: data,
    error,
    isFetching,
  };
};

export default useDepositUser;
