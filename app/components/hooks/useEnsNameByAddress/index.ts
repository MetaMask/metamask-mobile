import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectProviderConfig } from '../../../selectors/networkController';
import { doENSReverseLookup } from '../../../util/ENSUtils';

/**
 * Gets the ENS name for the account address
 *
 * @param address - Account address. This is intended to be defined.
 * @returns - An object containing the ENS name for the account address if it exists
 */
const useEnsNameByAddress = (address?: string) => {
  const [ensName, setEnsName] = useState('');
  const { chainId } = useSelector(selectProviderConfig);

  useEffect(() => {
    setEnsName('');
    if (!address) {
      return;
    }
    const fetchENSName = async () => {
      try {
        const ens: string | undefined = await doENSReverseLookup(
          address,
          chainId,
        );
        ens && setEnsName(ens);
      } catch (e) {
        // ENS either doesn't exist or failed to fetch.
      }
    };
    fetchENSName();
  }, [chainId, address]);

  return { ensName };
};

export default useEnsNameByAddress;
