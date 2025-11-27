import {
  SnapKeyring,
  SnapKeyringCallbacks,
  SnapKeyringInternalOptions,
  getDefaultInternalOptions,
} from '@metamask/eth-snap-keyring';
import Logger from '../../util/Logger';
import { showAccountNameSuggestionDialog } from './utils/showDialog';
import { SnapKeyringBuilderMessenger } from './types';
import { SnapId } from '@metamask/snaps-sdk';
import { assertIsValidSnapId } from '@metamask/snaps-utils';
import { getUniqueAccountName } from './utils/getUniqueAccountName';
import {
  getSnapName,
  isMultichainWalletSnap,
  isSnapPreinstalled,
} from './utils/snaps';
import { endTrace, TraceName } from '../../util/trace';
import { store } from '../../store';
import { MetaMetricsEvents } from '../../core/Analytics/MetaMetrics.events';
import { trackSnapAccountEvent } from '../Analytics/helpers/SnapKeyring/trackSnapAccountEvent';
import { endPerformanceTrace } from '../../core/redux/slices/performance';
import { PerformanceEventNames } from '../redux/slices/performance/constants';
import { areAddressesEqual } from '../../util/address';
import { isE2E } from '../../util/test/utils';
import { isMultichainAccountsState2Enabled } from '../../multichain-accounts/remote-feature-flag';

/**
 * Builder type for the Snap keyring.
 */
export interface SnapKeyringBuilder {
  name: 'SnapKeyringBuilder';
  state: null;

  (): SnapKeyring;
  type: typeof SnapKeyring.type;
}

/**
 * Helpers for the Snap keyring implementation.
 */
export interface SnapKeyringHelpers {
  persistKeyringHelper: () => Promise<void>;
  removeAccountHelper: (address: string) => Promise<void>;
}

class SnapKeyringImpl implements SnapKeyringCallbacks {
  readonly #messenger: SnapKeyringBuilderMessenger;

  readonly #persistKeyringHelper: SnapKeyringHelpers['persistKeyringHelper'];

  readonly #removeAccountHelper: SnapKeyringHelpers['removeAccountHelper'];

  constructor(
    messenger: SnapKeyringBuilderMessenger,
    { persistKeyringHelper, removeAccountHelper }: SnapKeyringHelpers,
  ) {
    this.#messenger = messenger;
    this.#persistKeyringHelper = persistKeyringHelper;
    this.#removeAccountHelper = removeAccountHelper;
  }

  async addressExists(address: string) {
    const addresses = await this.#messenger.call(
      'KeyringController:getAccounts',
    );
    return addresses.some((addr) => areAddressesEqual(addr, address));
  }

  async saveState() {
    await this.#persistKeyringHelper();
  }

  private async withApprovalFlow<Return>(
    run: (flowId: string) => Promise<Return>,
  ): Promise<Return> {
    const { id: flowId } = this.#messenger.call('ApprovalController:startFlow');

    try {
      return await run(flowId);
    } finally {
      this.#messenger.call('ApprovalController:endFlow', {
        id: flowId,
      });
    }
  }

  /**
   * Get the account name from the user through a dialog.
   *
   * @param snapId - ID of the Snap that created the account.
   * @param accountNameSuggestion - Suggested name for the account.
   * @returns The name that should be used for the account.
   */
  private async getAccountNameFromDialog(
    snapId: SnapId,
    accountNameSuggestion: string,
  ): Promise<{ success: boolean; accountName?: string }> {
    const { success, name: accountName } =
      await showAccountNameSuggestionDialog(
        snapId,
        this.#messenger,
        accountNameSuggestion,
      );

    return { success, accountName };
  }

  /**
   * Use the account name suggestion to decide the name of the account.
   *
   * @param accountNameSuggestion - Suggested name for the account.
   * @returns The name that should be used for the account.
   */
  private async getAccountNameFromSuggestion(
    accountNameSuggestion: string,
  ): Promise<{ success: boolean; accountName?: string }> {
    const accounts = await this.#messenger.call(
      'AccountsController:listMultichainAccounts',
    );
    const accountName = getUniqueAccountName(accounts, accountNameSuggestion);
    return { success: true, accountName };
  }

  private async addAccountConfirmations({
    snapId,
    handleUserInput,
    accountNameSuggestion,
    skipAccountNameSuggestionDialog,
    skipApprovalFlow,
  }: {
    snapId: SnapId;
    accountNameSuggestion: string;
    handleUserInput: (accepted: boolean) => Promise<void>;
    skipAccountNameSuggestionDialog: boolean;
    skipApprovalFlow: boolean;
  }): Promise<{ accountName?: string }> {
    if (skipApprovalFlow) {
      const { accountName } = await this.getAccountNameFromSuggestion(
        accountNameSuggestion,
      );
      await handleUserInput(true);
      return { accountName };
    }
    return await this.withApprovalFlow(async (_) => {
      const { success, accountName } = skipAccountNameSuggestionDialog
        ? await this.getAccountNameFromSuggestion(accountNameSuggestion)
        : await this.getAccountNameFromDialog(snapId, accountNameSuggestion);

      // User has cancelled account creation
      await handleUserInput(success);

      if (!success) {
        throw new Error('User denied account creation');
      }

      return { accountName };
    });
  }

  private async addAccountFinalize({
    address: _address,
    snapId,
    skipSetSelectedAccountStep,
    skipApprovalFlow,
    onceSaved,
    accountName,
  }: {
    address: string;
    snapId: SnapId;
    skipSetSelectedAccountStep: boolean;
    skipApprovalFlow: boolean;
    onceSaved: Promise<string>;
    accountName?: string;
  }) {
    const finalizeFn = async () => {
      try {
        // First, wait for the account to be fully saved.
        // NOTE: This might throw, so keep this in the `try` clause.
        const accountId = await onceSaved;

        // From here, we know the account has been saved into the Snap keyring
        // state, so we can safely uses this state to run post-processing.
        // (e.g. renaming the account, select the account, etc...)

        if (!skipSetSelectedAccountStep) {
          // Set the selected account to the new account
          this.#messenger.call(
            'AccountsController:setSelectedAccount',
            accountId,
          );
        }

        // HACK: In state 2, account creations can run in parallel, thus, `accountName`
        // sometimes conflict with other concurrent renaming. Since we don't rely on those
        // account names anymore, we just omit this part and make this race-free.
        // FIXME: We still rely on the old behavior in some e2e, so we cannot remove this
        // entirely.
        if (!isMultichainAccountsState2Enabled()) {
          if (accountName) {
            // Set the account name if one is provided
            this.#messenger.call(
              'AccountsController:setAccountName',
              accountId,
              accountName,
            );
          }
        }

        // Track successful account addition
        const snapName = getSnapName(snapId as SnapId, this.#messenger);
        trackSnapAccountEvent(
          MetaMetricsEvents.ACCOUNT_ADDED,
          snapId,
          snapName,
        );

        endTrace({
          name: TraceName.CreateSnapAccount,
        });

        store.dispatch(
          endPerformanceTrace({
            eventName: PerformanceEventNames.AddSnapAccount,
          }),
        );
      } catch (e) {
        // Error occurred while naming the account
        const error = e as Error;
        // This part of the flow is not awaited, so we just log the error for now:
        Logger.error(error, 'Error occurred while creating snap account');
      }
    };
    if (skipApprovalFlow) {
      return finalizeFn();
    }
    await this.withApprovalFlow(finalizeFn);
  }

  async addAccount(
    address: string,
    snapId: string,
    handleUserInput: (accepted: boolean) => Promise<void>,
    onceSaved: Promise<string>,
    accountNameSuggestion: string = '',
    {
      displayConfirmation,
      displayAccountNameSuggestion,
      setSelectedAccount,
    }: SnapKeyringInternalOptions = getDefaultInternalOptions(),
  ) {
    assertIsValidSnapId(snapId);

    // Preinstalled Snaps can skip some confirmation dialogs.
    const isPreinstalled = isSnapPreinstalled(snapId);

    // Since the introduction of BIP-44, multichain wallet Snaps will skip them automatically too!
    let skipAll =
      isMultichainAccountsState2Enabled() &&
      isPreinstalled &&
      isMultichainWalletSnap(snapId);
    // FIXME: We still rely on the old behavior in some e2e, so we do not skip them in this case.
    if (isE2E) {
      skipAll = false;
    }

    // If Snap is preinstalled and does not request confirmation, skip the confirmation dialog.
    const skipConfirmationDialog =
      skipAll || (isPreinstalled && !displayConfirmation);

    // Only pre-installed Snaps can skip the account name suggestion dialog.
    const skipAccountNameSuggestionDialog =
      skipAll || (isPreinstalled && !displayAccountNameSuggestion);

    // Only pre-installed Snaps can skip the account from being selected.
    const skipSetSelectedAccountStep =
      skipAll || (isPreinstalled && !setSelectedAccount);

    const skipApprovalFlow =
      skipConfirmationDialog && skipAccountNameSuggestionDialog;

    // First part of the flow, which includes confirmation dialogs (if not skipped).
    // Once confirmed, we resume the Snap execution.
    const { accountName } = await this.addAccountConfirmations({
      snapId,
      // We do not set the account name suggestion if it's a multichain wallet Snap since the
      // current naming could have race conditions with other account creations, and since
      // naming is now handled by multichain account groups, we can skip this entirely.
      accountNameSuggestion: skipAll ? '' : accountNameSuggestion,
      handleUserInput,
      skipAccountNameSuggestionDialog,
      skipApprovalFlow,
    });

    // The second part is about selecting the newly created account and showing some other
    // confirmation dialogs (or error dialogs if anything goes wrong while persisting the account
    // into the state.
    // eslint-disable-next-line no-void
    void this.addAccountFinalize({
      address,
      snapId,
      skipSetSelectedAccountStep,
      skipApprovalFlow,
      onceSaved,
      accountName,
    });
  }

  async removeAccount(
    address: string,
    snapId: string,
    handleUserInput: (accepted: boolean) => Promise<void>,
  ) {
    assertIsValidSnapId(snapId);

    // TODO: Implement proper snap account confirmations. Currently, we are approving everything for testing purposes.
    Logger.log(
      `SnapKeyring: removeAccount called with \n
          - address: ${address} \n
          - handleUserInput: ${handleUserInput} \n
          - snapId: ${snapId} \n`,
    );

    // Approve everything for now because we have not implemented snap account confirmations yet
    await handleUserInput(true);

    try {
      await this.#removeAccountHelper(address);
      await this.#persistKeyringHelper();

      // Track successful account removal
      const snapName = getSnapName(snapId as SnapId, this.#messenger);
      trackSnapAccountEvent(
        MetaMetricsEvents.ACCOUNT_REMOVED,
        snapId,
        snapName,
      );
    } catch (error) {
      Logger.error(error as Error, `Error removing snap account: ${address}`);
      const snapName = getSnapName(snapId as SnapId, this.#messenger);
      trackSnapAccountEvent(
        MetaMetricsEvents.ACCOUNT_REMOVED,
        snapId,
        snapName,
      );
      throw error;
    }
  }

  async redirectUser(snapId: string, url: string, message: string) {
    Logger.log(
      `SnapKeyring: redirectUser called with \n
          - snapId: ${snapId} \n
          - url: ${url} \n
          - message: ${message} \n`,
    );
  }
}

/**
 * Constructs a SnapKeyring builder with specified handlers for managing Snap accounts.
 *
 * @param messenger - The messenger instace.
 * @param helpers - Helpers required by the Snap keyring implementation.
 * @returns A Snap keyring builder.
 */
export function snapKeyringBuilder(
  messenger: SnapKeyringBuilderMessenger,
  helpers: SnapKeyringHelpers,
) {
  const builder = (() =>
    new SnapKeyring({
      messenger,
      callbacks: new SnapKeyringImpl(messenger, helpers),
      ///: BEGIN:ONLY_INCLUDE_IF(flask)
      isAnyAccountTypeAllowed: true,
      ///: END:ONLY_INCLUDE_IF
    })) as SnapKeyringBuilder;
  builder.type = SnapKeyring.type;

  return builder;
}
