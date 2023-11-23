import { RPC_METHODS } from '../Connection';
import DevLogger from '../utils/DevLogger';

export const overwriteRPCWith = ({
  rpc,
  accountAddress,
}: {
  rpc: { method: string; params: any; [key: string]: any };
  accountAddress: string;
}) => {
  // Handle
  if (rpc.method.toLowerCase() === RPC_METHODS.PERSONAL_SIGN.toLowerCase()) {
    // Replace address value with the selected address
    rpc.params = [rpc.params[0], accountAddress];
  } else {
    DevLogger.log(`overwriteRPCWith:: method=${rpc.method} not handled`);
  }

  return rpc;
};

export default overwriteRPCWith;
