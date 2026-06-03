// Shared types passed between the preflight modules.

export type Platform = 'ios' | 'android';

// Resolved execution mode (the --mode flag):
//   auto           fingerprint-gated reuse, build only if needed
//   fast           never build — fail loud if the app is missing
//   rebuild-native skip yarn setup, force native rebuild
//   clean          yarn setup → pod --repo-update → build (nuclear)
//   default        legacy flag-mapped behaviour (reuse, native build on miss)
export type Mode = 'auto' | 'fast' | 'rebuild-native' | 'clean' | 'default';

// Parsed CLI flags, before mode resolution folds them into `mode`.
export interface Flags {
  forcePlatform: Platform | '';
  mode: Mode;
  modeExplicit: boolean;
  rebuild: boolean;
  clean: boolean;
  launch: boolean;
  checkOnly: boolean;
  walletSetup: boolean;
  walletFixture: string;
  walletPw: string;
}

// Immutable run context assembled once at startup and threaded through every
// module. Paths are absolute unless noted; `root` is the worktree root and the
// process cwd for every shelled command.
export interface Ctx {
  root: string;
  scripts: string; // relative: "scripts/perps/agentic"
  plat: Platform;
  port: number;
  flags: Flags;

  // Resolved mode after folding legacy flags (flags.mode is the raw parse).
  mode: Mode;
  doClean: boolean;
  doRebuild: boolean;
  doLaunch: boolean;
  checkOnly: boolean;

  // Log destinations (absolute).
  logDir: string;
  logFile: string; // .agent/metro.log
  depsLog: string;
  podInstallLog: string;
  cdpLog: string;
  walletLog: string;

  // Timeouts (numbers, already sanitized).
  cdpWaitTimeout: number; // seconds
  cdpStatusTimeoutMs: number;
  cdpDiscoveryRetries: number;
  iosBuildTimeout: number; // seconds (0 = no timeout)

  // Platform-specific identity.
  bundleId: string; // ios
  simTarget: string; // ios: SIM_UDID | IOS_SIMULATOR | "booted"
  simLabel: string; // ios: IOS_SIMULATOR | SIM_UDID
  packageId: string; // android
  adbTarget: string; // android: resolved serial ("" if none)

  // Effective environment (process.env after .js.env merge).
  env: Record<string, string | undefined>;
}

// A single timed step, accumulated for the closing summary.
export interface StepTiming {
  name: string;
  seconds: number;
}

// Result of the deps/setup staleness gate.
export interface DepsDecision {
  jsDepsStale: boolean; // run `yarn install --immutable`
  setupStale: boolean; // run `yarn setup:expo` (superset)
}

// Outcome of the native app build/install + cache phase.
export interface AppPhaseResult {
  appInstalled: boolean;
  fingerprint: string | null;
  fromCache: boolean;
  // True when --check-only verified the installed app matches the fingerprint.
  checkOnlyFpVerified: boolean;
  checkOnlyFpValue: string;
}
