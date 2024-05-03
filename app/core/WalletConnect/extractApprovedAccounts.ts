import { Caveat, ValidPermission } from '@metamask/permission-controller';
import { Json } from 'json-rpc-engine';

export const extractApprovedAccounts = (
  accountPermission:
    | ValidPermission<any, Caveat<any, any> | Caveat<any, Json>>
    | undefined,
) => {
  const approvedAccounts = accountPermission?.caveats
    ?.map((caveat) => {
      if (Array.isArray(caveat?.value)) {
        return caveat.value.flat();
      }
      return undefined;
    })
    .flat() as string[];
  return approvedAccounts;
};

export default extractApprovedAccounts;
