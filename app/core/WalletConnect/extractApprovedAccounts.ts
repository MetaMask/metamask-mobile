import { Caveat, ValidPermission } from '@metamask/permission-controller';
import { Json } from '@metamask/json-rpc-engine';

export const extractApprovedAccounts = (
  accountPermission: // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ValidPermission<any, Caveat<any, any> | Caveat<any, Json>> | undefined,
) => {
  const approvedAccounts = accountPermission?.caveats
    ?.map((caveat) => {
      if (Array.isArray(caveat?.value)) {
        return caveat.value;
      }
      return undefined;
    })
    .flat() as string[];
  return approvedAccounts;
};

export default extractApprovedAccounts;
