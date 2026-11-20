import { TokenOverviewSelectorsIDs } from '../../../app/components/UI/AssetOverview/TokenOverview.testIds';
import { RedesignedSendViewSelectorsIDs } from '../../../app/components/Views/confirmations/components/send/RedesignedSendView.testIds';
import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';
import { QuoteViewSelectorIDs } from '../../selectors/Bridge/QuoteView.selectors';
import { SendActionViewSelectorsIDs } from '../../selectors/SendFlow/SendActionView.selectors';

/** A testID module member: a constant, or a function that builds one. */
type HintMember = string | ((argument: string) => string);

export interface HintCatalog {
  /** `Module` spreads its string values; `Module.member` reads one. */
  modules: Record<string, Record<string, HintMember>>;
  /** A bare token such as `keypad` expands to this list. */
  groups: Record<string, readonly string[]>;
}

/** In-app amount keypad keys (QuoteView.getKeypadKey / SendView numpad). */
export const KEYPAD_HINTS = [
  ...[...'0123456789'].map((digit) => `keypad-key-${digit}`),
  'keypad-key-dot',
  'keypad-delete-button',
];

const stringMembers = (
  source: Record<string, unknown>,
): Record<string, HintMember> => {
  const members: Record<string, HintMember> = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'string') members[key] = value;
    else if (typeof value === 'function')
      members[key] = value as (argument: string) => string;
  }
  return members;
};

/** The modules the scenario specs used to import. Hint text names these. */
const SCENARIO_HINT_CATALOG: HintCatalog = {
  modules: {
    WalletViewSelectorsIDs: stringMembers(WalletViewSelectorsIDs),
    TokenOverviewSelectorsIDs: stringMembers(TokenOverviewSelectorsIDs),
    QuoteViewSelectorIDs: stringMembers(QuoteViewSelectorIDs),
    RedesignedSendViewSelectorsIDs: stringMembers(
      RedesignedSendViewSelectorsIDs,
    ),
    SendActionViewSelectorsIDs: stringMembers(SendActionViewSelectorsIDs),
  },
  groups: { keypad: KEYPAD_HINTS },
};

const MEMBER =
  /^([A-Za-z_][A-Za-z0-9_]*)(?:\.([A-Za-z_][A-Za-z0-9_]*)(?:\((?:"([^"]*)"|'([^']*)')\))?)?$/;

/**
 * Turns `## Hints` tokens into the same string list the old spec passed to
 * `scenarioTest`. Module names are read from the catalog, never copied.
 */
export function resolveScenarioHints(
  tokens: readonly string[],
  catalog: HintCatalog = SCENARIO_HINT_CATALOG,
): string[] {
  const hints: string[] = [];
  for (const token of tokens) {
    const group = catalog.groups[token];
    if (group) {
      hints.push(...group);
      continue;
    }
    const match = MEMBER.exec(token);
    const moduleName = match?.[1];
    const moduleMembers = moduleName ? catalog.modules[moduleName] : undefined;
    if (!match || !moduleMembers) {
      if (/^[A-Z]/.test(token)) {
        throw new Error(
          `Unknown hint "${token}". Name a catalog module, Module.member, or a literal id.`,
        );
      }
      hints.push(token);
      continue;
    }
    const memberName = match[2];
    if (!memberName) {
      for (const value of Object.values(moduleMembers)) {
        if (typeof value === 'string') hints.push(value);
      }
      continue;
    }
    const member = moduleMembers[memberName];
    const argument = match[3] ?? match[4];
    if (typeof member === 'function') {
      if (argument === undefined) {
        throw new Error(`Hint "${token}" needs a string argument`);
      }
      hints.push(member(argument));
      continue;
    }
    if (typeof member === 'string') {
      if (argument !== undefined) {
        throw new Error(`Hint "${token}" is a constant, not a function`);
      }
      hints.push(member);
      continue;
    }
    throw new Error(`Unknown hint member "${token}"`);
  }
  return hints;
}
