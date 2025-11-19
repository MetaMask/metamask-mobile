// Third party dependencies.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { KeyringTypes } from '@metamask/keyring-controller';

// External Dependencies.
import { doENSReverseLookup } from '../../../util/ENSUtils';
import { selectChainId } from '../../../selectors/networkController';
import {
  selectInternalAccounts,
  selectSelectedInternalAccount,
} from '../../../selectors/accountsController';
import { AccountSyncTracker } from '../../../util/performance/AccountSyncTracker';

// Internal dependencies
import {
  Account,
  EnsByAccountAddress,
  UseAccounts,
  UseAccountsParams,
} from './useAccounts.types';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  getFormattedAddressFromInternalAccount,
  isNonEvmAddress,
} from '../../../core/Multichain/utils';

/**
 * Hook that returns both wallet accounts and ens name information.
 *
 * @returns Object that contains both wallet accounts and ens name information.
 */
const useAccounts = ({
  isLoading = false,
}: UseAccountsParams = {}): UseAccounts => {
  const isMountedRef = useRef(false);
  const ensLookupsRunningRef = useRef(false); // Prevent concurrent ENS lookups
  const fetchENSCallCountRef = useRef(0); // Track how many times fetchENSNames is called
  const getAccountsCallCountRef = useRef(0); // Track how many times getAccounts is called
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [evmAccounts, setEVMAccounts] = useState<Account[]>([]);
  const [ensByAccountAddress, setENSByAccountAddress] =
    useState<EnsByAccountAddress>({});
  const currentChainId = useSelector(selectChainId);
  const internalAccounts = useSelector(selectInternalAccounts);
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  const fetchENSNames = useCallback(
    async ({
      flattenedAccounts,
      startingIndex,
    }: {
      flattenedAccounts: Account[];
      startingIndex: number;
    }) => {
      fetchENSCallCountRef.current++;
      console.log(`🔍 [DEBUG] fetchENSNames called (call #${fetchENSCallCountRef.current}) with ${flattenedAccounts.length} accounts`);
      
      // Prevent concurrent ENS lookups
      if (ensLookupsRunningRef.current) {
        console.log(`🔍 [DEBUG] ENS lookups already running, ignoring this call (${flattenedAccounts.length} accounts)`);
        return;
      }
      
      // Check if we're already tracking ENS lookups (to avoid overwriting on multiple calls)
      const currentSession = AccountSyncTracker.getCurrentSession();
      const isFirstCall = currentSession && !currentSession.phases.ensLookups;
      
      if (isFirstCall) {
        // Track this phase only on the FIRST call
        console.log(`🔍 [DEBUG] Starting ensLookups phase (FIRST CALL - ${flattenedAccounts.length} accounts)`);
        ensLookupsRunningRef.current = true; // Mark as running
        AccountSyncTracker.startPhase('ensLookups', {
          accountCount: flattenedAccounts.length,
          startingIndex
        });
      } else {
        console.log(`🔍 [DEBUG] ensLookups called again (ignoring - already tracking) - ${flattenedAccounts.length} accounts`);
        return; // Don't do ENS lookups again if already running
      }
      
      // Ensure index exists in account list.
      let safeStartingIndex = startingIndex;
      let mirrorIndex = safeStartingIndex - 1;
      const latestENSbyAccountAddress: EnsByAccountAddress = {};
      let hasChanges = false;

      if (startingIndex < 0) {
        safeStartingIndex = 0;
      } else if (startingIndex > flattenedAccounts.length) {
        safeStartingIndex = flattenedAccounts.length - 1;
      }

      const fetchENSName = async (accountIndex: number) => {
        const { address } = flattenedAccounts[accountIndex];
        try {
          const ens: string | undefined = await doENSReverseLookup(
            address,
            currentChainId,
          );
          if (ens) {
            latestENSbyAccountAddress[address] = ens;
            hasChanges = true;
          }
        } catch (e) {
          // ENS either doesn't exist or failed to fetch.
        }
      };

      // Use try/finally to ensure session ends even if component unmounts
      const initialAccountCount = flattenedAccounts.length;
      console.log(`🔍 [DEBUG] About to start ENS lookup loop for ${initialAccountCount} accounts`);
      console.log(`🔍 [DEBUG] Starting index: ${startingIndex}, safeStartingIndex: ${safeStartingIndex}, mirrorIndex: ${mirrorIndex}`);
      let loopCount = 0;
      const maxIterations = initialAccountCount + 10; // Safety limit
      
      try {
        // Iterate outwards in both directions starting at the starting index.
        while (mirrorIndex >= 0 || safeStartingIndex < flattenedAccounts.length) {
          loopCount++;
          
          // Safety check to prevent infinite loops
          if (loopCount > maxIterations) {
            console.log(`🔍 [DEBUG] ENS lookup safety limit reached (${maxIterations} iterations), stopping`);
            console.log(`🔍 [DEBUG] Current state: mirrorIndex=${mirrorIndex}, safeStartingIndex=${safeStartingIndex}, arrayLength=${flattenedAccounts.length}`);
            break;
          }
          
          // Log progress every 50 accounts
          if (loopCount % 50 === 0) {
            console.log(`🔍 [DEBUG] ENS lookup progress: ${loopCount} iterations, ${Object.keys(latestENSbyAccountAddress).length} ENS names found`);
            // Check if array length changed (BUG DETECTION!)
            if (flattenedAccounts.length !== initialAccountCount) {
              console.log(`🚨 [BUG DETECTED] flattenedAccounts.length changed from ${initialAccountCount} to ${flattenedAccounts.length} during execution!`);
            }
          }
          
          if (!isMountedRef.current) {
            console.log(`🔍 [DEBUG] Component unmounted at iteration ${loopCount}, stopping early`);
            break;
          }
          
          if (safeStartingIndex < flattenedAccounts.length) {
            await fetchENSName(safeStartingIndex);
          }
          if (mirrorIndex >= 0) {
            await fetchENSName(mirrorIndex);
          }
          mirrorIndex--;
          safeStartingIndex++;
        }
        
        console.log(`🔍 [DEBUG] ENS lookup loop completed after ${loopCount} iterations`);
        
        // Only update state if we have new ENS names
        if (hasChanges && isMountedRef.current) {
          setENSByAccountAddress((prevState) => ({
            ...prevState,
            ...latestENSbyAccountAddress,
          }));
        }
      } catch (error) {
        console.log(`🔍 [DEBUG] Error during ENS lookups:`, error);
      } finally {
        // Reset the running flag
        ensLookupsRunningRef.current = false;
        
        // ALWAYS end this phase and the session, even if component unmounts
        console.log(`🔍 [DEBUG] Ending ensLookups phase (${Object.keys(latestENSbyAccountAddress).length} ENS names found)`);
        AccountSyncTracker.endPhase('ensLookups', {
          ensNamesFound: Object.keys(latestENSbyAccountAddress).length,
          totalAccountsProcessed: loopCount
        });
        
        // End the session now that all operations are complete
        console.log('🔍 [DEBUG] Ending session - all account sync operations complete');
        AccountSyncTracker.endSession();
      }
    },
    [currentChainId],
  );

  const getAccounts = useCallback(() => {
    if (!isMountedRef.current) return;
    
    getAccountsCallCountRef.current++;
    console.log(`🔍 [DEBUG] getAccounts called (call #${getAccountsCallCountRef.current}) - internalAccounts.length: ${internalAccounts.length}`);
    
    // Check if we're already tracking this phase (to avoid overwriting on multiple calls)
    const currentSession = AccountSyncTracker.getCurrentSession();
    const isFirstCall = currentSession && !currentSession.phases.getAccountsHook;
    
    if (isFirstCall) {
      // Track this phase only on the FIRST call
      console.log('🔍 [DEBUG] Starting getAccountsHook phase (FIRST CALL)');
      AccountSyncTracker.startPhase('getAccountsHook');
    } else {
      console.log('🔍 [DEBUG] getAccountsHook called again (ignoring - already tracking)');
    }
    
    // Keep track of the Y position of account item. Used for scrolling purposes.
    let yOffset = 0;
    let selectedIndex = 0;
    const flattenedAccounts: Account[] = internalAccounts.map(
      (internalAccount: InternalAccount, index: number) => {
        const formattedAddress =
          getFormattedAddressFromInternalAccount(internalAccount);
        const isSelected =
          selectedInternalAccount?.address === internalAccount.address;
        if (isSelected) {
          selectedIndex = index;
        }

        const mappedAccount: Account = {
          id: internalAccount.id,
          name: internalAccount.metadata.name,
          address: formattedAddress,
          type: internalAccount.metadata.keyring.type as KeyringTypes,
          yOffset,
          isSelected,
          // This only works for EOAs
          caipAccountId: `${internalAccount.scopes[0]}:${internalAccount.address}`,
          scopes: internalAccount.scopes,
          snapId: internalAccount.metadata.snap?.id,
          isLoadingAccount: false,
        };
        // Calculate height of the account item.
        yOffset += 78;
        if (internalAccount.metadata.keyring.type !== KeyringTypes.hd) {
          yOffset += 24;
        }
        return mappedAccount;
      },
    );

    setAccounts(flattenedAccounts);
    const evmAccounts = flattenedAccounts.filter((account) => !isNonEvmAddress(account.address));
    setEVMAccounts(evmAccounts);
    
    // Log account type breakdown
    const accountTypes: Record<string, number> = {};
    flattenedAccounts.forEach((account) => {
      accountTypes[account.type] = (accountTypes[account.type] || 0) + 1;
    });
    console.log(`🔍 [DEBUG] Account breakdown:`, {
      total: flattenedAccounts.length,
      evm: evmAccounts.length,
      nonEvm: flattenedAccounts.length - evmAccounts.length,
      byType: accountTypes
    });
    
    // Only end the phase if we started it (on the LAST call when all accounts are loaded)
    // We end it every time since we can't predict which call is "last"
    const session = AccountSyncTracker.getCurrentSession();
    if (session?.phases.getAccountsHook && session.phases.getAccountsHook.status === 'pending') {
      console.log(`🔍 [DEBUG] Ending getAccountsHook phase (${flattenedAccounts.length} accounts)`);
      AccountSyncTracker.endPhase('getAccountsHook', {
        accountCount: flattenedAccounts.length,
        evmAccountCount: evmAccounts.length
      });
    }
    
    console.log(`🔍 [DEBUG] About to call fetchENSNames with ${flattenedAccounts.length} accounts`);
    fetchENSNames({ flattenedAccounts, startingIndex: selectedIndex });
  }, [internalAccounts, fetchENSNames, selectedInternalAccount?.address]);

  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
    }
    if (isLoading) return;
    getAccounts();
    return () => {
      isMountedRef.current = false;
    };
  }, [getAccounts, isLoading]);

  return {
    accounts,
    evmAccounts,
    ensByAccountAddress,
  };
};

export default useAccounts;
