import React, {
  memo,
  useCallback,
  useState,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { View, TouchableOpacity, InteractionManager } from 'react-native';
import { useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';

import {
  Icon,
  IconName,
  IconSize,
  IconColor,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../hooks';
import AnimatedSpinner, {
  SpinnerSize,
} from '../../../../../components/UI/AnimatedSpinner';
import Logger from '../../../../../util/Logger';
import { strings } from '../../../../../../locales/i18n';
import { selectWalletsMap } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { useWalletInfo } from '../../../../../components/Views/MultichainAccounts/WalletDetails/hooks/useWalletInfo';
import { AccountWalletId, AccountWalletType } from '@metamask/account-api';
import { AccountListBottomSheetSelectorsIDs } from '../../../../../components/Views/AccountSelector/AccountListBottomSheet.testIds';
import createStyles from './AccountListFooter.styles';
import Engine from '../../../../../core/Engine';
import {
  TraceName,
  TraceOperation,
  endTrace,
  trace,
} from '../../../../../util/trace';
import { useAccountWalletOperationsLoadingStates } from '../../../../../util/accounts/useAccountWalletOperationsLoadingStates';

interface AccountListFooterProps {
  walletId: AccountWalletId;
  onAccountCreated: (newAccountId: string) => void;
}

/**
 * ID of the in-flight CreateMultichainAccount span owned by a footer create.
 * Shared so screen-level abandon can close the same span the footer started,
 * without relying on the default trace key that a stale finally could close
 * after a newer create has already begun.
 */
let activeCreateMultichainAccountTraceId: string | undefined;

/**
 * Abandon any in-flight CreateMultichainAccount span started by a footer.
 * Clears ownership first so a later finally for the abandoned create cannot
 * endTrace a newer pending span that reused the named metric.
 */
export function abandonCreateMultichainAccountTrace(): void {
  const id = activeCreateMultichainAccountTraceId;
  activeCreateMultichainAccountTraceId = undefined;
  endTrace({
    name: TraceName.CreateMultichainAccount,
    ...(id ? { id } : {}),
  });
}

const AccountListFooter = memo(
  ({ walletId, onAccountCreated }: AccountListFooterProps) => {
    const [isLoading, setIsLoading] = useState(false);
    // Per-create span id. Kept in a ref so finally can end only this create's
    // span after FlashList clipping / screen abandon / a newer create starts.
    const createTraceIdRef = useRef<string | undefined>(undefined);
    const { styles } = useStyles(createStyles, {});
    const {
      areAnyOperationsLoading,
      loadingMessage: accountOperationLoadingMessage,
    } = useAccountWalletOperationsLoadingStates(walletId);

    const isLoadingState = isLoading || areAnyOperationsLoading;

    const actionLabel = useMemo(() => {
      if (areAnyOperationsLoading) {
        return accountOperationLoadingMessage;
      }

      if (isLoadingState) {
        return strings('multichain_accounts.wallet_details.creating_account');
      }

      return strings('multichain_accounts.wallet_details.create_account');
    }, [
      isLoadingState,
      areAnyOperationsLoading,
      accountOperationLoadingMessage,
    ]);

    // Get wallet information to find the keyringId
    const walletsMap = useSelector(selectWalletsMap);
    const wallet = walletsMap?.[walletId];
    const walletInfo = useWalletInfo(wallet);

    const endCreateMultichainAccountTrace = useCallback(() => {
      const id = createTraceIdRef.current;
      if (!id) {
        return;
      }

      createTraceIdRef.current = undefined;
      if (activeCreateMultichainAccountTraceId === id) {
        activeCreateMultichainAccountTraceId = undefined;
      }
      endTrace({ name: TraceName.CreateMultichainAccount, id });
    }, []);

    // End trace when the loading finishes.
    // Do not end on unmount/blur here: this footer is a FlashList cell with
    // removeClippedSubviews, so scrolling can tear it down while creation is
    // still running. Screen-level abandon lives on MultichainAccountSelectorList.
    useEffect(() => {
      if (!isLoading) {
        endCreateMultichainAccountTrace();
      }
    }, [endCreateMultichainAccountTrace, isLoading]);

    const handleCreateAccount = useCallback(async () => {
      if (!walletInfo?.keyringId) {
        Logger.error(
          new Error('No keyring ID found for wallet'),
          'Cannot create account without keyring ID',
        );
        endCreateMultichainAccountTrace();
        setIsLoading(false);
        return;
      }

      // Loading state is now set in handlePress before this function is called

      try {
        const { MultichainAccountService } = Engine.context;

        const newAccountGroup =
          await MultichainAccountService.createNextMultichainAccountGroup({
            entropySource: walletInfo.keyringId,
          });

        // Notify parent component about the newly created account
        if (newAccountGroup?.id) {
          onAccountCreated(newAccountGroup.id);
        }
      } catch (e: unknown) {
        Logger.error(
          e as Error,
          'error while trying to add a new multichain account',
        );
      } finally {
        // End here so the span still closes if the FlashList cell was clipped
        // (unmounted) before creation finished and local isLoading state is gone.
        // Uses this create's id so a stale finally cannot close a newer span.
        endCreateMultichainAccountTrace();
        setIsLoading(false);
      }
    }, [
      endCreateMultichainAccountTrace,
      onAccountCreated,
      walletInfo?.keyringId,
    ]);

    const handlePress = useCallback(() => {
      const createTraceId = uuidv4();
      createTraceIdRef.current = createTraceId;
      activeCreateMultichainAccountTraceId = createTraceId;

      // Start the trace before setting the loading state
      trace({
        name: TraceName.CreateMultichainAccount,
        op: TraceOperation.AccountCreate,
        id: createTraceId,
      });

      // Force immediate state update
      setIsLoading(true);

      // Use InteractionManager to ensure animations complete before heavy work
      InteractionManager.runAfterInteractions(() => {
        handleCreateAccount();
      });
    }, [handleCreateAccount]);

    if (!wallet || wallet.type !== AccountWalletType.Entropy) {
      return null;
    }

    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[
            styles.button,
            (isLoadingState || !walletInfo?.keyringId) && styles.buttonDisabled,
          ]}
          onPress={handlePress}
          disabled={isLoadingState || !walletInfo?.keyringId}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            {isLoadingState ? (
              <AnimatedSpinner size={SpinnerSize.SM} />
            ) : (
              <Icon
                name={IconName.Add}
                size={IconSize.Md}
                color={IconColor.PrimaryDefault}
              />
            )}
          </View>
          <Text
            variant={TextVariant.BodyMd}
            style={styles.buttonText}
            testID={AccountListBottomSheetSelectorsIDs.CREATE_ACCOUNT}
          >
            {actionLabel}
          </Text>
        </TouchableOpacity>
      </View>
    );
  },
);

AccountListFooter.displayName = 'AccountListFooter';

export default AccountListFooter;
