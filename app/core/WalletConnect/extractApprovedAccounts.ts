import { Caveat, ValidPermission } from '@metamask/permission-controller';
import { Json } from '@metamask/json-rpc-engine';

export const extractApprovedAccounts = (
  accountPermission:
    | ValidPermission<any, Caveat<any, any> | Caveat<any, Json>>
    | undefined,
) => {
  const approvedAccounts = accountPermission?.caveats
    ?.map((restrictedAccount) => {
      if (Array.isArray(restrictedAccount?.value)) {
        return restrictedAccount.value
          .map((account) => {
            if (
              typeof account === 'object' &&
              account &&
              'address' in account
            ) {
              return account.address;
            }
            return undefined;
          })
          .flat();
      }
      return undefined;
    })
    .flat() as string[];
  return approvedAccounts;
};

export default extractApprovedAccounts;
