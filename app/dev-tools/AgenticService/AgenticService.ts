/**
 * AgenticService — __DEV__-only bridge for Recipe v1 runners.
 *
 * This file is not bundled in production builds. It exposes a stable control
 * surface for deterministic local recipes while keeping user-visible proof
 * flows on the real app path.
 */
import {
  NavigationContainerRef,
  ParamListBase,
} from '@react-navigation/native';
import { Dimensions, Platform } from 'react-native';
import Logger from '../../util/Logger';
import ReduxService from '../../core/redux';
import { persistor } from '../../store';
import Engine from '../../core/Engine';
import { Engine as EngineClass } from '../../core/Engine/Engine';
import {
  passwordSet,
  setExistingUser,
  logIn,
  seedphraseBackedUp,
  setMultichainAccountsIntroModalSeen,
} from '../../actions/user';
import { setCompletedOnboarding } from '../../actions/onboarding';
import { mnemonicPhraseToBytes } from '@metamask/key-tree';
import { AccountImportStrategy } from '@metamask/keyring-controller';
import type { AccountGroupId } from '@metamask/account-api';
import StorageWrapper from '../../store/storage-wrapper';
import {
  OPTIN_META_METRICS_UI_SEEN,
  PERPS_GTM_MODAL_SHOWN,
  PREDICT_GTM_MODAL_SHOWN,
  REWARDS_GTM_MODAL_SHOWN,
} from '../../constants/storage';
import { analytics } from '../../util/analytics/analytics';
import {
  setDataCollectionForMarketing,
  setOsAuthEnabled,
} from '../../actions/security';
import { setLockTime } from '../../actions/settings';
import AccountTreeInitService from '../../multichain-accounts/AccountTreeInitService';
import Routes from '../../constants/navigation/Routes';
import SecureKeychain from '../../core/SecureKeychain';
import AUTHENTICATION_TYPE from '../../constants/userProperties';
import DevLogger from '../../core/SDKConnect/utils/DevLogger';
import { importNewSecretRecoveryPhrase } from '../../actions/multiSrp';
import { bufferToHex, privateToAddress } from 'ethereumjs-util';
import Authentication from '../../core/Authentication';
import { emitStepHud } from './AgentStepHud';
import { Wallet as EthersWallet } from 'ethers';
import PerpsConnectionManager from '../../components/UI/Perps/services/PerpsConnectionManager';
import { getStreamManagerInstance } from '../../components/UI/Perps/providers/PerpsStreamManager';

// ─── Fiber tree types ──────────────────────────────────────────────────────

/**
 * Minimal React fiber node shape used to walk the component tree
 * via __REACT_DEVTOOLS_GLOBAL_HOOK__.
 */
interface FiberNode {
  child: FiberNode | null;
  sibling: FiberNode | null;
  return: FiberNode | null;
  memoizedProps: {
    testID?: string;
    onPress?: (...args: unknown[]) => unknown;
    onChangeText?: (text: string) => void;
    [key: string]: unknown;
  } | null;
  stateNode: {
    scrollTo?: (opts: { y: number; animated: boolean }) => void;
    scrollToOffset?: (opts: { offset: number; animated: boolean }) => void;
    measure?: (
      callback: (
        x: number,
        y: number,
        width: number,
        height: number,
        pageX: number,
        pageY: number,
      ) => void,
    ) => void;
    measureInWindow?: (
      callback: (x: number, y: number, width: number, height: number) => void,
    ) => void;
    [key: string]: unknown;
  } | null;
}

interface FiberRoot {
  current: FiberNode | null;
}

interface ReactDevToolsHook {
  renderers: Map<number, unknown>;
  getFiberRoots?: (id: number) => Set<FiberRoot>;
}

/** Shape of the __DEV__-only agentic bridge on globalThis. */
interface AgenticHudStep {
  id: string;
  status?: string;
  intent: string;
  progress?: { current?: number; total?: number };
  detail?: string;
  error?: string;
  nodeId?: string;
  debug?: { nodeId?: string; proofTarget?: unknown };
}

interface AgenticBridge {
  platform: string;
  replayHarnessPatch?: string;
  navigate: (name: string, params?: object) => void;
  getRoute: () => unknown;
  getState: () => unknown;
  canGoBack: () => boolean;
  goBack: () => void;
  listAccounts: () => { id: string; address: string; name: string }[];
  getSelectedAccount: () => { id: string; address: string; name: string };
  pressTestId: (testId: string) => {
    ok: boolean;
    testId?: string;
    error?: string;
  };
  pressText: (
    text: string,
    options?: { requiredTexts?: string[]; maxTexts?: number },
  ) => { ok: boolean; text?: string; error?: string };
  scrollView: (options?: {
    testId?: string;
    offset?: number;
    animated?: boolean;
  }) => {
    ok: boolean;
    error?: string;
    testId?: string;
    offset?: number;
    animated?: boolean;
  };
  setInput: (
    testId: string,
    value: string,
  ) => {
    ok: boolean;
    testId?: string;
    value?: string;
    error?: string;
  };
  getTextByTestId: (
    testId: string,
    options?: { all?: boolean },
  ) => string | string[] | null;
  getAncestorTextsByTestId: (
    testId: string,
    options?: { requiredLabels?: string[]; maxTexts?: number },
  ) => string[] | null;
  getRowValue: (
    label: string,
    pattern: string,
    options?: {
      anchorTestId?: string;
      requiredLabels?: string[];
      maxTexts?: number;
    },
  ) => string | null;
  switchAccount: (address: string) => {
    switched: boolean;
    id: string;
    address: string;
    name: string;
  };
  setupWallet: (fixture: {
    password: string;
    accounts: {
      type: 'mnemonic' | 'privateKey';
      value: string;
      name?: string;
      count?: number;
      numberOfAccounts?: number;
      names?: string[];
    }[];
    settings?: {
      metametrics?: boolean;
      skipGtmModals?: boolean;
      skipPerpsTutorial?: boolean;
      autoLockNever?: boolean;
      deviceAuthEnabled?: boolean;
    };
  }) => Promise<{
    ok: boolean;
    error?: string;
    step?: string;
    accounts?: { address: string; name: string }[];
  }>;
  applyWalletFixture: (
    fixture: Parameters<AgenticBridge['setupWallet']>[0],
  ) => Promise<{
    ok: boolean;
    error?: string;
    accounts?: { address: string; name: string }[];
  }>;
  showStep: (step: AgenticHudStep) => void;
  hideStep: () => void;
  refreshPerpsStreams: () => Promise<{ ok: boolean; positions: number }>;
  findFiberByTestId: (testId: string) => boolean;
  queryUiTarget: (options: {
    testId?: string;
    textContains?: string;
    visibility?: 'tree' | 'viewport';
  }) => Promise<{
    present: boolean;
    visible: boolean;
    visibility: 'tree' | 'viewport';
    testId?: string;
    textContains?: string;
    textMatched?: boolean;
    rect?: { x: number; y: number; width: number; height: number };
    viewport?: { width: number; height: number };
    error?: string;
  }>;
}

type WalletFixture = Parameters<AgenticBridge['setupWallet']>[0];

interface FixtureKeyringController {
  isUnlocked: () => boolean;
  submitPassword: (password: string) => Promise<void>;
}

function logFixtureStep(step: string, detail?: Record<string, unknown>) {
  DevLogger.log(`[AgenticService] fixture ${step}`, detail);
}

async function withFixtureTimeout<T>(
  label: string,
  work: Promise<T>,
  timeoutMs = 30_000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Fixture step timed out: ${label}`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function waitForFixtureCondition(
  label: string,
  condition: () => boolean,
  timeoutMs = 90_000,
  intervalMs = 500,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (condition()) {
      return;
    }
    await sleep(intervalMs);
  }
  throw new Error(`Fixture step timed out: ${label}`);
}

async function createFixtureHdAccount(
  label: string,
  createAccount: () => Promise<unknown>,
  accountExists: () => boolean,
): Promise<void> {
  await withFixtureTimeout(label, createAccount(), 90_000);
  await waitForFixtureCondition(label, accountExists, 30_000);
}

declare global {
  // eslint-disable-next-line no-var
  var __AGENTIC__: AgenticBridge | undefined;
  // eslint-disable-next-line no-var
  var __REACT_DEVTOOLS_GLOBAL_HOOK__: ReactDevToolsHook | undefined;
}

// ─── Fiber tree helpers ─────────────────────────────────────────────────────

/**
 * Walk a fiber sub-tree depth-first, calling `visitor` on each node.
 * Returns true as soon as visitor returns true (short-circuit).
 * Sibling traversal is iterative to avoid stack overflow on wide trees.
 */
function walkFiber(
  fiber: FiberNode | null,
  visitor: (f: FiberNode) => boolean,
): boolean {
  let current: FiberNode | null = fiber;
  while (current) {
    if (visitor(current)) return true;
    if (walkFiber(current.child, visitor)) return true;
    current = current.sibling;
  }
  return false;
}

/**
 * Find the first fiber node whose `testID` prop matches.
 */
function findFiberByTestId(
  fiber: FiberNode | null,
  testId: string,
): FiberNode | null {
  let result: FiberNode | null = null;
  walkFiber(fiber, (f) => {
    if (f.memoizedProps?.testID === testId) {
      result = f;
      return true;
    }
    return false;
  });
  return result;
}

/**
 * Iterate all React renderer roots and call `visitor` on each root fiber.
 * Returns true if any visitor call returns true.
 */
function walkFiberRoots(visitor: (rootFiber: FiberNode) => boolean): boolean {
  const hook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!hook?.renderers) return false;

  for (const [id] of hook.renderers) {
    const fiberRoots = hook.getFiberRoots?.(id);
    if (!fiberRoots) continue;
    let found = false;
    fiberRoots.forEach((root) => {
      if (!found && root.current) {
        found = visitor(root.current);
      }
    });
    if (found) return true;
  }
  return false;
}

// ─── Shared helpers ─────────────────────────────────────────────────────────

/** Map an internal account to the slim shape exposed by the bridge. */
function toAccountSummary(a: {
  id: string;
  address: string;
  metadata: { name: string };
}): { id: string; address: string; name: string } {
  return { id: a.id, address: a.address, name: a.metadata.name };
}

export function getFixtureMnemonicCount(account?: {
  count?: number;
  numberOfAccounts?: number;
}): number {
  const raw = account?.count ?? account?.numberOfAccounts ?? 1;
  const count = Number(raw);
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new Error(`Invalid mnemonic account count: ${raw}`);
  }
  return count;
}

export function getFixtureAccountNames(
  account: { name?: string; names?: string[] } | undefined,
  count: number,
): string[] {
  return Array.from({ length: count }, (_unused, index) => {
    const explicitName = account?.names?.[index];
    if (typeof explicitName === 'string' && explicitName.trim()) {
      return explicitName.trim();
    }
    if (
      index === 0 &&
      typeof account?.name === 'string' &&
      account.name.trim()
    ) {
      return account.name.trim();
    }
    return `Account ${index + 1}`;
  });
}

interface FixtureEvmAccount {
  id: string;
  address: string;
  metadata: { name: string; keyring?: { type?: string } };
}

function findEvmAccounts(accounts: Record<string, unknown>) {
  return (Object.values(accounts) as FixtureEvmAccount[]).filter((account) =>
    account.address?.startsWith('0x'),
  );
}

function isHdFixtureAccount(account: FixtureEvmAccount) {
  return account.metadata?.keyring?.type === 'HD Key Tree';
}

function normalizePrivateKey(value: string) {
  return value.startsWith('0x') ? value.slice(2) : value;
}

function getPrivateKeyAddress(value: string) {
  return bufferToHex(
    privateToAddress(Buffer.from(normalizePrivateKey(value), 'hex')),
  ).toLowerCase();
}

function isExpectedLegacyAccountTreeInitError(error: unknown) {
  const message = String((error as Error).message || error);
  return (
    message.includes('Money Keyring') ||
    message.includes('No keyringBuilder found')
  );
}

async function initializeFixtureAccountTree(
  options: {
    allowLegacyAccountTreeInitFailure?: boolean;
  } = {},
) {
  try {
    await AccountTreeInitService.initializeAccountTree();
  } catch (error) {
    if (
      !options.allowLegacyAccountTreeInitFailure ||
      !isExpectedLegacyAccountTreeInitError(error)
    ) {
      throw error;
    }
    // Historical replay vaults can lack the multichain keyring builder. In that
    // mode AccountsController remains the source of truth for fixture validation
    // and account labels; group renames are skipped when no account-tree group
    // exists.
    Logger.log(
      '[AgenticService] Skipping fixture account-tree refresh for historical replay fixture setup',
    );
  }
}

async function markFixtureMetricsOptInSeenIfNeeded(fixture: WalletFixture) {
  if (fixture.settings?.metametrics !== undefined) {
    await StorageWrapper.setItem(OPTIN_META_METRICS_UI_SEEN, 'true');
  }
}

function resetNavigationToWalletHome(
  navRef: NavigationContainerRef<ParamListBase>,
) {
  navRef.reset({
    routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
  });
}

async function unlockFixtureVault(
  fixture: WalletFixture,
  keyringController: FixtureKeyringController,
) {
  if (keyringController.isUnlocked()) {
    return;
  }

  logFixtureStep('unlock-via-authentication');
  await Authentication.unlockWallet({ password: fixture.password });
  if (keyringController.isUnlocked()) {
    return;
  }

  // A previous interrupted fixture setup can leave a vault present while Redux
  // still marks the user as new. Authentication.unlockWallet then navigates to
  // onboarding without submitting the password. Recover that dev-only partial
  // state before materializing accounts.
  logFixtureStep('unlock-via-keyring-fallback');
  await keyringController.submitPassword(fixture.password);
  if (!keyringController.isUnlocked()) {
    throw new Error('Fixture vault remained locked after password submit');
  }

  const store = ReduxService.store;
  store.dispatch(passwordSet());
  store.dispatch(seedphraseBackedUp());
  store.dispatch(setCompletedOnboarding(true));
  store.dispatch(setExistingUser(true));
  store.dispatch(logIn());
  store.dispatch(setMultichainAccountsIntroModalSeen(true));
}

function getMnemonicFirstAddress(value: string) {
  return EthersWallet.fromMnemonic(
    value,
    "m/44'/60'/0'/0/0",
  ).address.toLowerCase();
}

interface FixtureHdWallet {
  keyringId?: string;
  accounts: FixtureEvmAccount[];
}

function getHdFixtureWallets(
  accountsController: {
    state: { internalAccounts: { accounts: Record<string, unknown> } };
  },
  accountTreeController: {
    state: { accountTree?: { wallets?: Record<string, unknown> } };
  },
): FixtureHdWallet[] {
  const evmById = new Map(
    findEvmAccounts(accountsController.state.internalAccounts.accounts).map(
      (account) => [account.id, account],
    ),
  );
  const wallets = accountTreeController.state.accountTree?.wallets ?? {};
  const result: FixtureHdWallet[] = [];
  for (const wallet of Object.values(wallets) as {
    metadata?: { entropy?: { id?: string } };
    groups?: Record<
      string,
      { accounts?: string[]; metadata?: { entropy?: { groupIndex?: number } } }
    >;
  }[]) {
    const entropyId = wallet.metadata?.entropy?.id;
    if (!entropyId) continue;
    const accounts = Object.values(wallet.groups ?? {})
      .map((group) => ({
        index: group.metadata?.entropy?.groupIndex ?? Number.MAX_SAFE_INTEGER,
        account: group.accounts?.[0]
          ? evmById.get(group.accounts[0])
          : undefined,
      }))
      .filter((entry): entry is { index: number; account: FixtureEvmAccount } =>
        Boolean(entry.account),
      )
      .sort((left, right) => left.index - right.index)
      .map((entry) => entry.account);
    if (accounts.length > 0) {
      result.push({ keyringId: entropyId, accounts });
    }
  }
  if (result.length > 0) {
    return result;
  }
  const legacyHdAccounts = findEvmAccounts(
    accountsController.state.internalAccounts.accounts,
  ).filter(isHdFixtureAccount);
  return legacyHdAccounts.length > 0 ? [{ accounts: legacyHdAccounts }] : [];
}

async function ensureFixtureMnemonicAccounts(
  mnemonicAccount: WalletFixture['accounts'][number],
  mnemonicIndex: number,
  controllers: {
    AccountsController: {
      state: { internalAccounts: { accounts: Record<string, unknown> } };
    };
    AccountTreeController: {
      state: { accountTree?: { wallets?: Record<string, unknown> } };
      setAccountGroupName: (
        accountGroupId: AccountGroupId,
        accountGroupName: string,
      ) => void;
    };
  },
  options: { allowLegacyAccountTreeInitFailure?: boolean } = {},
) {
  const { AccountsController, AccountTreeController } = controllers;
  const count = getFixtureMnemonicCount(mnemonicAccount);
  const names = getFixtureAccountNames(mnemonicAccount, count);
  const firstAddress = getMnemonicFirstAddress(mnemonicAccount.value);
  const findWallet = () =>
    getHdFixtureWallets(AccountsController, AccountTreeController).find(
      (hdWallet) =>
        hdWallet.accounts[0]?.address.toLowerCase() === firstAddress,
    );

  let wallet = findWallet();
  if (!wallet) {
    logFixtureStep('import-mnemonic', { mnemonicIndex });
    await importNewSecretRecoveryPhrase(mnemonicAccount.value, {
      shouldSelectAccount: false,
    });
    await initializeFixtureAccountTree(options);
    wallet = findWallet();
  }

  if (!wallet) {
    throw new Error(
      `No HD wallet found for fixture mnemonic ${mnemonicIndex + 1}`,
    );
  }

  if (wallet.accounts.length < count && !wallet.keyringId) {
    throw new Error(
      `Cannot add fixture accounts to legacy vault (no entropy source); fixture expects ${count} accounts but vault has ${wallet.accounts.length}`,
    );
  }
  const { MultichainAccountService } = Engine.context;
  if (wallet.accounts.length < count) {
    const fromGroupIndex = wallet.accounts.length;
    const toGroupIndex = count - 1;
    const entropySource = wallet.keyringId as string;
    logFixtureStep('create-hd-accounts', {
      mnemonicIndex,
      fromGroupIndex,
      toGroupIndex,
      count,
    });
    await createFixtureHdAccount(
      `create HD accounts ${fromGroupIndex + 1}-${count} for mnemonic ${
        mnemonicIndex + 1
      }`,
      () =>
        MultichainAccountService.createMultichainAccountGroups({
          fromGroupIndex,
          toGroupIndex,
          entropySource,
        }),
      () => (findWallet()?.accounts.length ?? 0) >= count,
    );
    wallet = findWallet();
    if (!wallet) {
      throw new Error(
        `No HD wallet found after adding fixture accounts ${fromGroupIndex + 1}-${count}`,
      );
    }
  }

  wallet.accounts.slice(0, count).forEach((account, index) => {
    setFixtureAccountName(AccountTreeController, account, names[index]);
  });
}

function findAccountGroupIdByAccountId(
  accountTreeController: {
    state: { accountTree?: { wallets?: Record<string, unknown> } };
  },
  accountId: string,
): string | undefined {
  const wallets = accountTreeController.state.accountTree?.wallets ?? {};
  for (const wallet of Object.values(wallets) as {
    groups?: Record<string, { accounts?: string[] }>;
  }[]) {
    for (const [groupId, group] of Object.entries(wallet.groups ?? {})) {
      if (group.accounts?.includes(accountId)) {
        return groupId;
      }
    }
  }
  return undefined;
}

function setFixtureAccountName(
  accountTreeController: {
    state: { accountTree?: { wallets?: Record<string, unknown> } };
    setAccountGroupName: (
      accountGroupId: AccountGroupId,
      accountGroupName: string,
    ) => void;
  },
  account: { id: string; address: string },
  name: string,
) {
  Engine.setAccountLabel(account.address, name);
  const groupId = findAccountGroupIdByAccountId(
    accountTreeController,
    account.id,
  );
  // Legacy vault fallback skips account-tree init, so no group exists yet.
  // The account label set above is sufficient; skip the group rename instead
  // of throwing and crashing fixture setup.
  if (!groupId) {
    DevLogger.log(
      `[AgenticService] No account group for fixture account ${account.address}; skipped group rename`,
    );
    return;
  }
  accountTreeController.setAccountGroupName(groupId as AccountGroupId, name);
}

async function materializeFixtureAccounts(
  fixture: WalletFixture,
  controllers: {
    KeyringController: {
      importAccountWithStrategy: (
        strategy: AccountImportStrategy,
        args: string[],
      ) => Promise<unknown>;
    };
    AccountsController: {
      state: { internalAccounts: { accounts: Record<string, unknown> } };
    };
    AccountTreeController: {
      state: { accountTree?: { wallets?: Record<string, unknown> } };
      setAccountGroupName: (
        accountGroupId: AccountGroupId,
        accountGroupName: string,
      ) => void;
    };
  },
  options: { allowLegacyAccountTreeInitFailure?: boolean } = {},
) {
  const { KeyringController, AccountsController, AccountTreeController } =
    controllers;
  const mnemonicAccounts = fixture.accounts.filter(
    (account) => account.type === 'mnemonic',
  );

  for (const [mnemonicIndex, mnemonicAccount] of mnemonicAccounts.entries()) {
    await ensureFixtureMnemonicAccounts(
      mnemonicAccount,
      mnemonicIndex,
      {
        AccountsController,
        AccountTreeController,
      },
      options,
    );
  }

  for (const account of fixture.accounts) {
    if (account.type !== 'privateKey') continue;
    const address = getPrivateKeyAddress(account.value);
    let imported = findEvmAccounts(
      AccountsController.state.internalAccounts.accounts,
    ).find((evmAccount) => evmAccount.address.toLowerCase() === address);

    if (!imported) {
      logFixtureStep('import-private-key', { address });
      await withFixtureTimeout(
        `import private key ${address}`,
        KeyringController.importAccountWithStrategy(
          AccountImportStrategy.privateKey,
          [`0x${normalizePrivateKey(account.value)}`],
        ),
      );
      imported = findEvmAccounts(
        AccountsController.state.internalAccounts.accounts,
      ).find((evmAccount) => evmAccount.address.toLowerCase() === address);
    }

    if (!imported) {
      throw new Error(
        `Fixture private key import did not create account ${address}`,
      );
    }
    if (account.name) {
      setFixtureAccountName(AccountTreeController, imported, account.name);
    }
  }
}

/**
 * Walk a fiber sub-tree looking for a scrollable stateNode (scrollTo or
 * scrollToOffset). When `walkSiblings` is false only the child axis is
 * traversed — useful when starting from a testId anchor whose siblings
 * are unrelated components.
 */
function tryScroll(
  start: FiberNode | null,
  offset: number,
  animated: boolean,
  walkSiblings = true,
): boolean {
  let current: FiberNode | null = start;
  while (current) {
    const sn = current.stateNode;
    if (sn) {
      if (typeof sn.scrollTo === 'function') {
        sn.scrollTo({ y: offset, animated });
        return true;
      }
      if (typeof sn.scrollToOffset === 'function') {
        sn.scrollToOffset({ offset, animated });
        return true;
      }
    }
    if (tryScroll(current.child, offset, animated)) return true;
    current = walkSiblings ? current.sibling : null;
  }
  return false;
}

function targetMatches(
  fiber: FiberNode,
  options: { testId?: string; textContains?: string },
): boolean {
  if (options.testId && fiber.memoizedProps?.testID !== options.testId) {
    return false;
  }
  if (options.textContains) {
    const needle = options.textContains.toLowerCase();
    const texts = options.testId
      ? collectFiberTexts(fiber)
      : collectOwnFiberTexts(fiber);
    return texts.some((text) => text.toLowerCase().includes(needle));
  }
  return Boolean(options.testId);
}

function findUiTargetFiber(
  rootFiber: FiberNode,
  options: { testId?: string; textContains?: string },
): FiberNode | null {
  let result: FiberNode | null = null;
  walkFiber(rootFiber, (fiber) => {
    if (targetMatches(fiber, options)) {
      result = fiber;
      return true;
    }
    return false;
  });
  return result;
}

function findMeasurableStateNode(
  fiber: FiberNode | null,
): FiberNode['stateNode'] | null {
  let result: FiberNode['stateNode'] | null = null;
  walkFiber(fiber, (node) => {
    const sn = node.stateNode;
    if (
      sn &&
      (typeof sn.measureInWindow === 'function' ||
        typeof sn.measure === 'function')
    ) {
      result = sn;
      return true;
    }
    return false;
  });
  return result;
}

function measureStateNode(
  stateNode: FiberNode['stateNode'],
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!stateNode) {
      resolve(null);
      return;
    }
    let settled = false;
    const settle = (
      value: { x: number; y: number; width: number; height: number } | null,
    ) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    // Native measure callbacks never fire for detached/off-screen views;
    // fall back to null after a short delay so callers don't hang forever.
    const timeout = setTimeout(() => settle(null), 2500);
    const finish = (x: number, y: number, width: number, height: number) => {
      clearTimeout(timeout);
      settle({ x, y, width, height });
    };
    try {
      if (typeof stateNode.measureInWindow === 'function') {
        stateNode.measureInWindow(finish);
        return;
      }
      if (typeof stateNode.measure === 'function') {
        stateNode.measure((_x, _y, width, height, pageX, pageY) =>
          finish(pageX, pageY, width, height),
        );
        return;
      }
    } catch (e) {
      Logger.log(String(e), 'AgenticService.measureStateNode');
    }
    clearTimeout(timeout);
    settle(null);
  });
}

async function queryUiTarget(options: {
  testId?: string;
  textContains?: string;
  visibility?: 'tree' | 'viewport';
}): Promise<{
  present: boolean;
  visible: boolean;
  visibility: 'tree' | 'viewport';
  testId?: string;
  textContains?: string;
  textMatched?: boolean;
  rect?: { x: number; y: number; width: number; height: number };
  viewport?: { width: number; height: number };
  error?: string;
}> {
  const visibility: 'tree' | 'viewport' =
    options.visibility === 'viewport' ? 'viewport' : 'tree';
  let target: FiberNode | null = null;

  walkFiberRoots((rootFiber) => {
    target = findUiTargetFiber(rootFiber, options);
    return Boolean(target);
  });

  const base = {
    present: Boolean(target),
    visible: Boolean(target) && visibility === 'tree',
    visibility,
    testId: options.testId,
    textContains: options.textContains,
    textMatched: options.textContains
      ? Boolean(
          target &&
            collectFiberTexts(target).some((text) =>
              text
                .toLowerCase()
                .includes(String(options.textContains).toLowerCase()),
            ),
        )
      : undefined,
  };

  if (!target || visibility === 'tree') {
    return base;
  }

  const stateNode = findMeasurableStateNode(target);
  if (!stateNode) {
    return {
      ...base,
      visible: false,
      error:
        'Target exists in fiber tree but no measurable native node was found',
    };
  }

  const rect = await measureStateNode(stateNode);
  const viewport = Dimensions.get('window');
  if (!rect) {
    return {
      ...base,
      visible: false,
      viewport: { width: viewport.width, height: viewport.height },
      error: 'Target exists in fiber tree but measurement returned no frame',
    };
  }

  const visible =
    rect.width > 0 &&
    rect.height > 0 &&
    rect.x < viewport.width &&
    rect.y < viewport.height &&
    rect.x + rect.width > 0 &&
    rect.y + rect.height > 0;

  return {
    ...base,
    visible,
    rect,
    viewport: { width: viewport.width, height: viewport.height },
  };
}

function appendTextContent(value: unknown, out: string[]) {
  if (value === null || value === undefined) {
    return;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const text = String(value).trim();
    if (text.length > 0) {
      out.push(text);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => appendTextContent(entry, out));
    return;
  }
  if (typeof value === 'object' && value && 'props' in value) {
    const maybeProps = (value as { props?: { children?: unknown } }).props;
    if (maybeProps?.children !== undefined) {
      appendTextContent(maybeProps.children, out);
    }
  }
}

function dedupeTexts(texts: string[]): string[] {
  return texts.filter((text, index) => texts.indexOf(text) === index);
}

function collectFiberTexts(fiber: FiberNode | null): string[] {
  const texts: string[] = [];
  walkFiber(fiber, (node) => {
    if (node.memoizedProps?.children !== undefined) {
      appendTextContent(node.memoizedProps.children, texts);
    }
    return false;
  });
  return dedupeTexts(texts);
}

function collectOwnFiberTexts(fiber: FiberNode | null): string[] {
  const texts: string[] = [];
  if (fiber?.memoizedProps?.children !== undefined) {
    appendTextContent(fiber.memoizedProps.children, texts);
  }
  return dedupeTexts(texts);
}

function findAncestorTexts(
  fiber: FiberNode | null,
  predicate: (texts: string[]) => boolean,
  maxTexts = 14,
): string[] | null {
  let current = fiber;
  while (current) {
    const texts = collectFiberTexts(current);
    if (texts.length > 0 && texts.length <= maxTexts && predicate(texts)) {
      return texts;
    }
    current = current.return;
  }
  return null;
}

function findRowTexts(
  label: string,
  options: {
    anchorTestId?: string;
    requiredLabels?: string[];
    maxTexts?: number;
  } = {},
): string[] | null {
  const { anchorTestId, requiredLabels = [], maxTexts = 14 } = options;
  const matchesRow = (texts: string[]) =>
    texts.includes(label) &&
    requiredLabels.every((requiredLabel) => texts.includes(requiredLabel));

  if (anchorTestId) {
    let anchoredMatch: string[] | null = null;
    walkFiberRoots((rootFiber) => {
      const anchor = findFiberByTestId(rootFiber, anchorTestId);
      if (!anchor) {
        return false;
      }
      anchoredMatch = findAncestorTexts(anchor, matchesRow, maxTexts);
      return Boolean(anchoredMatch);
    });
    if (anchoredMatch) {
      return anchoredMatch;
    }
  }

  let fallbackMatch: string[] | null = null;
  walkFiberRoots((rootFiber) =>
    walkFiber(rootFiber, (fiber) => {
      const texts = collectFiberTexts(fiber);
      if (texts.length === 0 || texts.length > maxTexts) {
        return false;
      }
      if (!matchesRow(texts)) {
        return false;
      }
      fallbackMatch = texts;
      return true;
    }),
  );

  return fallbackMatch;
}

function getRowValue(
  label: string,
  pattern: string,
  options: {
    anchorTestId?: string;
    requiredLabels?: string[];
    maxTexts?: number;
  } = {},
): string | null {
  const rowTexts = findRowTexts(label, options);
  if (!rowTexts) {
    return null;
  }
  const matcher = new RegExp(pattern);
  return rowTexts.find((text) => text !== label && matcher.test(text)) ?? null;
}

// ─── AgenticService ─────────────────────────────────────────────────────────

/**
 * __DEV__-only service that installs the `globalThis.__AGENTIC__` bridge.
 *
 * The bridge exposes navigation primitives, account helpers, and UI
 * interaction methods (pressTestId, scrollView) so that AI coding agents
 * can inspect and drive the app remotely via Metro's Hermes CDP WebSocket.
 *
 * Consumed by the runner-owned Mobile bridge runtime.
 * See docs/perps/perps-agentic-feedback-loop.md for the full workflow.
 */
const AgenticService = {
  /**
   * Install the agentic bridge on globalThis.
   *
   * @param navRef  - Raw (unwrapped) navigation container ref
   * @param deferredNav - The requestAnimationFrame-deferred proxy
   */
  install(
    navRef: NavigationContainerRef<ParamListBase>,
    deferredNav: NavigationContainerRef<ParamListBase>,
  ) {
    // Defensive guard against accidental production imports/calls; the bridge
    // must never assign globals outside development builds.
    if (!__DEV__) return;

    Logger.log('[AgenticService] __AGENTIC__ bridge installed');

    globalThis.__AGENTIC__ = {
      platform: Platform.OS,
      replayHarnessPatch: 'legacy-wallet-fixture-r2',
      navigate: (name: string, params?: object) =>
        (
          deferredNav as unknown as {
            navigate: (name: string, params?: object) => void;
          }
        ).navigate(name, params),
      getRoute: () => navRef.getCurrentRoute(),
      getState: () => navRef.getState(),
      canGoBack: () => navRef.canGoBack(),
      goBack: () => deferredNav.goBack(),
      listAccounts: () =>
        Engine.context.AccountsController.listAccounts().map(toAccountSummary),
      getSelectedAccount: () =>
        toAccountSummary(
          Engine.context.AccountsController.getSelectedAccount(),
        ),
      pressTestId: (testId: string) => {
        try {
          const found = walkFiberRoots((rootFiber) =>
            walkFiber(rootFiber, (f) => {
              if (
                f.memoizedProps?.testID === testId &&
                typeof f.memoizedProps?.onPress === 'function'
              ) {
                f.memoizedProps.onPress();
                return true;
              }
              return false;
            }),
          );
          if (found) return { ok: true, testId };
          return {
            ok: false,
            error: `No component with testID="${testId}" found or no onPress prop`,
          };
        } catch (e) {
          return { ok: false, error: String(e) };
        }
      },
      pressText: (
        text: string,
        options: { requiredTexts?: string[]; maxTexts?: number } = {},
      ) => {
        const { requiredTexts = [], maxTexts = 14 } = options;
        try {
          let bestMatch: FiberNode | null = null;
          let bestTextCount = Number.POSITIVE_INFINITY;
          walkFiberRoots((rootFiber) =>
            walkFiber(rootFiber, (fiber) => {
              if (typeof fiber.memoizedProps?.onPress !== 'function') {
                return false;
              }
              const texts = collectFiberTexts(fiber);
              if (texts.length === 0 || texts.length > maxTexts) {
                return false;
              }
              if (!texts.includes(text)) {
                return false;
              }
              if (requiredTexts.some((required) => !texts.includes(required))) {
                return false;
              }
              if (texts.length < bestTextCount) {
                bestMatch = fiber;
                bestTextCount = texts.length;
              }
              return false;
            }),
          );
          const matched = bestMatch as FiberNode | null;
          if (matched && typeof matched.memoizedProps?.onPress === 'function') {
            matched.memoizedProps.onPress();
            return { ok: true, text };
          }
          return {
            ok: false,
            error: `No pressable found for text="${text}"`,
          };
        } catch (e) {
          return { ok: false, error: String(e) };
        }
      },
      scrollView: (
        options: {
          testId?: string;
          offset?: number;
          animated?: boolean;
        } = {},
      ) => {
        const {
          testId: scrollTestId,
          offset = 300,
          animated = false,
        } = options;
        try {
          const found = walkFiberRoots((rootFiber) => {
            if (scrollTestId) {
              const anchor = findFiberByTestId(rootFiber, scrollTestId);
              if (!anchor) return false;
              return tryScroll(anchor, offset, animated, false);
            }
            return tryScroll(rootFiber, offset, animated);
          });
          if (found)
            return { ok: true, testId: scrollTestId, offset, animated };
          return {
            ok: false,
            error: scrollTestId
              ? `No scrollable found near testID="${scrollTestId}"`
              : 'No scrollable found in fiber tree',
          };
        } catch (e) {
          return { ok: false, error: String(e) };
        }
      },
      setInput: (testId: string, value: string) => {
        try {
          const result: {
            ok: boolean;
            testId?: string;
            value?: string;
            error?: string;
          } = {
            ok: false,
            error: `No component with testID="${testId}" found`,
          };
          walkFiberRoots((rootFiber) => {
            const target = findFiberByTestId(rootFiber, testId);
            if (!target) return false;
            // Walk the found fiber and its parents looking for onChangeText
            let current: FiberNode | null = target;
            while (current) {
              if (typeof current.memoizedProps?.onChangeText === 'function') {
                current.memoizedProps.onChangeText(value);
                result.ok = true;
                result.testId = testId;
                result.value = value;
                result.error = undefined;
                return true;
              }
              current = current.return;
            }
            result.error = `Component with testID="${testId}" has no onChangeText prop`;
            return true;
          });
          return result;
        } catch (e) {
          return { ok: false, error: String(e) };
        }
      },
      getTextByTestId: (testId: string, options: { all?: boolean } = {}) => {
        let texts: string[] | null = null;
        walkFiberRoots((rootFiber) => {
          const target = findFiberByTestId(rootFiber, testId);
          if (!target) {
            return false;
          }
          texts = collectFiberTexts(target);
          return true;
        });
        const collected = texts as string[] | null;
        if (!collected || collected.length === 0) {
          return null;
        }
        return options.all ? collected : collected[0];
      },
      getAncestorTextsByTestId: (
        testId: string,
        options: { requiredLabels?: string[]; maxTexts?: number } = {},
      ) => {
        const { requiredLabels = [], maxTexts = 14 } = options;
        let texts: string[] | null = null;
        walkFiberRoots((rootFiber) => {
          const target = findFiberByTestId(rootFiber, testId);
          if (!target) {
            return false;
          }
          texts = findAncestorTexts(
            target,
            (candidateTexts) =>
              requiredLabels.every((label) => candidateTexts.includes(label)),
            maxTexts,
          );
          return Boolean(texts);
        });
        return texts;
      },
      getRowValue: (
        label: string,
        pattern: string,
        options: {
          anchorTestId?: string;
          requiredLabels?: string[];
          maxTexts?: number;
        } = {},
      ) => getRowValue(label, pattern, options),
      switchAccount: (address: string) => {
        const accounts = Engine.context.AccountsController.listAccounts();
        const target = accounts.find(
          (a: { address: string }) =>
            a.address.toLowerCase() === address.toLowerCase(),
        );
        if (!target) {
          throw new Error(`No account found for address ${address}`);
        }
        Engine.setSelectedAddress(target.address);
        return { switched: true, ...toAccountSummary(target) };
      },
      showStep: (step: AgenticHudStep) => {
        emitStepHud(step);
      },
      hideStep: () => {
        emitStepHud(null);
      },
      refreshPerpsStreams: async () => {
        await PerpsConnectionManager.ensureConnected({
          source: 'agentic_refresh_perps_streams',
          suppressError: true,
        });
        const streamManager = getStreamManagerInstance();
        streamManager.clearAllChannels();
        const positions = await Engine.context.PerpsController.getPositions();
        return {
          ok: true,
          positions: Array.isArray(positions) ? positions.length : 0,
        };
      },
      findFiberByTestId: (testId: string): boolean => {
        let found = false;
        walkFiberRoots((rootFiber) => {
          if (findFiberByTestId(rootFiber, testId)) {
            found = true;
            return true;
          }
          return false;
        });
        return found;
      },
      queryUiTarget,
      applyWalletFixture: async (fixture) => {
        let setupStep = 'start';
        try {
          const {
            MultichainAccountService,
            KeyringController,
            AccountsController,
            AccountTreeController,
          } = Engine.context;
          // The backup subscriber reads the Engine class static, so set it on
          // the class (not the facade) before importing/renaming accounts to
          // avoid racing native keychain export during fixture apply.
          EngineClass.disableAutomaticVaultBackup = true;
          // Authentication.unlockWallet can navigate to the metrics opt-in
          // screen when the seen flag is absent. Persist the fixture preference
          // before unlock so existing-vault fixture replay stays on the wallet
          // setup path instead of being interrupted by onboarding UI.
          setupStep = 'persist-metrics-setting';
          await markFixtureMetricsOptInSeenIfNeeded(fixture);

          // Unlock via the real auth flow (loginVaultCreation + dispatchLogin +
          // post-login) rather than a bare KeyringController.submitPassword, so
          // multichain services and Redux/auth state are consistent before we
          // mutate accounts.
          setupStep = 'unlock-fixture-vault';
          await unlockFixtureVault(fixture, KeyringController);
          // Existing replay vaults can have the same historical multichain
          // account-tree init gap as fresh legacy setup. Only the known legacy
          // init errors are tolerated by this option; unexpected errors still
          // throw from initializeFixtureAccountTree().
          const legacyAccountTreeInitOptions = {
            allowLegacyAccountTreeInitFailure: true,
          };
          await initializeFixtureAccountTree(legacyAccountTreeInitOptions);
          try {
            await withFixtureTimeout(
              'initialize multichain account service',
              MultichainAccountService.init(),
              60_000,
            );
          } catch (error) {
            if (!isExpectedLegacyAccountTreeInitError(error)) {
              throw error;
            }
            Logger.log(
              '[AgenticService] Skipping multichain account service initialization for historical replay fixture apply',
            );
          }
          await materializeFixtureAccounts(
            fixture,
            {
              KeyringController,
              AccountsController,
              AccountTreeController,
            },
            legacyAccountTreeInitOptions,
          );
          const ethAccs = findEvmAccounts(
            AccountsController.state.internalAccounts.accounts,
          ).map(toAccountSummary);
          return { ok: true, accounts: ethAccs };
        } catch (e) {
          return {
            ok: false,
            step: setupStep,
            error: String((e as Error).message || e),
          };
        }
      },
      setupWallet: async (fixture) => {
        let setupStep = 'start';
        try {
          setupStep = 'read-engine';
          const {
            MultichainAccountService,
            KeyringController,
            AccountsController,
            AccountTreeController,
          } = Engine.context;
          const store = ReduxService.store;
          const settings = fixture.settings ?? {};
          // Deliberately one-way for the dev harness process: fixture setup
          // rewrites vault/account state, so automatic backup must stay disabled
          // for the rest of this simulator session to avoid native keychain
          // export paths racing the synthetic setup flow.
          EngineClass.disableAutomaticVaultBackup = true;

          // 1. Create wallet from the first mnemonic (same path as onboarding UI)
          setupStep = 'create-wallet';
          const mnemonicAccount = fixture.accounts.find(
            (a) => a.type === 'mnemonic',
          );
          let usedLegacyVaultSetup = false;
          if (mnemonicAccount) {
            const mnemonic = mnemonicPhraseToBytes(mnemonicAccount.value);
            try {
              logFixtureStep('create-wallet-restore');
              await withFixtureTimeout(
                'create multichain wallet from fixture mnemonic',
                MultichainAccountService.createMultichainAccountWallet({
                  type: 'restore',
                  password: fixture.password,
                  mnemonic,
                }),
                60_000,
              );
            } catch (error) {
              if (!isExpectedLegacyAccountTreeInitError(error)) {
                throw error;
              }
              Logger.log(
                '[AgenticService] Falling back to legacy vault restore for historical replay fixture setup',
              );
              await KeyringController.createNewVaultAndRestore(
                fixture.password,
                mnemonic,
              );
              usedLegacyVaultSetup = true;
            }
          } else {
            try {
              logFixtureStep('create-wallet-empty');
              await withFixtureTimeout(
                'create multichain wallet',
                MultichainAccountService.createMultichainAccountWallet({
                  type: 'create',
                  password: fixture.password,
                }),
                60_000,
              );
            } catch (error) {
              if (!isExpectedLegacyAccountTreeInitError(error)) {
                throw error;
              }
              Logger.log(
                '[AgenticService] Falling back to legacy vault creation for historical replay fixture setup',
              );
              await KeyringController.createNewVaultAndKeychain(
                fixture.password,
              );
              usedLegacyVaultSetup = true;
            }
          }

          // 2. Initialize services (same as Authentication.dispatchLogin)
          setupStep = 'initialize-services';
          if (!usedLegacyVaultSetup) {
            try {
              await AccountTreeInitService.initializeAccountTree();
              await MultichainAccountService.init();
            } catch (error) {
              if (!isExpectedLegacyAccountTreeInitError(error)) {
                throw error;
              }
              Logger.log(
                '[AgenticService] Skipping multichain account-tree initialization for historical replay fixture setup',
              );
            }
          }

          // 3. Materialize requested fixture accounts. A mnemonic account can
          // declare count/numberOfAccounts plus names[]; this is generic
          // fixture semantics, not a dev-account special case.
          setupStep = 'materialize-srp-accounts';
          await materializeFixtureAccounts(
            fixture,
            {
              KeyringController,
              AccountsController,
              AccountTreeController,
            },
            { allowLegacyAccountTreeInitFailure: usedLegacyVaultSetup },
          );

          // 4. Dispatch all onboarding/auth flags
          setupStep = 'dispatch-onboarding-flags';
          store.dispatch(passwordSet());
          store.dispatch(seedphraseBackedUp());
          store.dispatch(setCompletedOnboarding(true));
          store.dispatch(setExistingUser(true));
          store.dispatch(logIn());

          // 5. Suppress post-onboarding modals if explicitly requested
          setupStep = 'persist-modal-settings';
          if (settings.skipGtmModals === true) {
            await Promise.all([
              StorageWrapper.setItem(PERPS_GTM_MODAL_SHOWN, 'true'),
              StorageWrapper.setItem(PREDICT_GTM_MODAL_SHOWN, 'true'),
              StorageWrapper.setItem(REWARDS_GTM_MODAL_SHOWN, 'true'),
            ]);
            // Suppress ExperienceEnhancer (marketing consent) modal
            store.dispatch(setDataCollectionForMarketing(false));
          }

          // 5b. Set metrics UI as seen (prevents Authentication.unlockWallet
          // from navigating to OptinMetrics after setupWallet resets to Wallet)
          setupStep = 'persist-metrics-setting';
          await markFixtureMetricsOptInSeenIfNeeded(fixture);

          // 5c. Mark multichain accounts intro modal as seen
          setupStep = 'dispatch-multichain-intro-seen';
          store.dispatch(setMultichainAccountsIntroModalSeen(true));

          // 6. Skip perps tutorial onboarding if requested
          setupStep = 'persist-perps-tutorial-setting';
          if (settings.skipPerpsTutorial === true) {
            Engine.context.PerpsController?.markTutorialCompleted();
          }

          // 7. Set auto-lock to "Never" (-1) for agentic workflows
          setupStep = 'dispatch-auto-lock';
          if (settings.autoLockNever === true) {
            ReduxService.store.dispatch(setLockTime(-1));
          }

          // 8. Enable device authentication only on Android fixture runs.
          // On iOS simulator, toggling OS auth during synthetic setup can drive
          // react-native-keychain/quick-crypto secret export on the JS runtime
          // and crash the app after setupWallet returns. Android is the only
          // harness path that stores the fixture password for auto-unlock here.
          setupStep = 'dispatch-device-auth';
          if (
            settings.deviceAuthEnabled === true &&
            Platform.OS === 'android'
          ) {
            ReduxService.store.dispatch(setOsAuthEnabled(true));
          }

          // 8b. Store password in SecureKeychain for device-auth auto-unlock on reload (Android only)
          if (
            settings.deviceAuthEnabled === true &&
            Platform.OS === 'android'
          ) {
            DevLogger.log('[AUTO-UNLOCK] Storing password in SecureKeychain', {
              authType: AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION,
            });
            await SecureKeychain.setGenericPassword(
              fixture.password,
              AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION,
            );
            DevLogger.log('[AUTO-UNLOCK] SecureKeychain password stored');
          }

          // 9. Configure MetaMetrics if specified
          setupStep = 'configure-metametrics';
          if (settings.metametrics === false) {
            await analytics.optOut();
          } else if (settings.metametrics === true) {
            await analytics.optIn();
          }

          // 10. Navigate to wallet (same as Authentication.unlockWallet)
          setupStep = 'navigate-wallet';
          resetNavigationToWalletHome(navRef);

          // 11. Collect all ETH accounts for the summary
          setupStep = 'collect-accounts';
          const ethAccs = findEvmAccounts(
            AccountsController.state.internalAccounts.accounts,
          ).map(toAccountSummary);

          return { ok: true, accounts: ethAccs };
        } catch (e) {
          return {
            ok: false,
            step: setupStep,
            error: String((e as Error).message || e),
          };
        }
      },
    };

    try {
      (globalThis as { store?: unknown }).store = ReduxService.store;
      (globalThis as { persistor?: unknown }).persistor = persistor;
    } catch (error) {
      Logger.log(
        String((error as Error).message || error),
        'AgenticService.install.exposeReduxGlobals',
      );
    }
    (globalThis as { Engine?: unknown }).Engine = Engine;
  },
};

export default AgenticService;
export {
  walkFiber,
  findFiberByTestId,
  walkFiberRoots,
  tryScroll,
  toAccountSummary,
};
export type { FiberNode, FiberRoot, ReactDevToolsHook, AgenticBridge };
