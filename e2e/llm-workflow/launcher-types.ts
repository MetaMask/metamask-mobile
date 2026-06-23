/**
 * Resolved iOS launch options after prerequisites validation.
 */
export interface ResolvedIOSLaunchOptions {
  /** UDID of the target simulator device (from input or auto-resolved booted device). */
  readonly simulatorDeviceId: string;
  /** Absolute path to MetaMask.app bundle (.app directory). */
  readonly appBundlePath: string;
  /** iOS application bundle identifier. */
  readonly appBundleId: string;
  /** Optional Metro bundler port for watch-mode attach (Phase 3). */
  readonly metroPort?: number;
  /** xcodebuild destination string built from simulator UDID (e.g. `platform=iOS Simulator,id=<UDID>`). */
  readonly destination: string;
  /** True when the app was discovered already installed on the target simulator (factual, never mutated). */
  readonly appAlreadyInstalled: boolean;
  /** Metadata from the `.app` bundle that was selected for this launch. */
  readonly selectedAppMetadata: IOSAppBundleMetadata;
  /** Metadata from the app currently installed on the target simulator (null if none). */
  readonly installedAppMetadata: IOSAppBundleMetadata | null;
  /**
   * How the app will be installed during this launch.
   *
   * - `reuse-installed`   – App is already on the simulator, no install needed.
   * - `install-new`       – No app on simulator, install from resolved path.
   * - `install-explicit`  – Explicit bundle provided, install it.
   * - `reinstall`         – Uninstall existing app, then install from resolved path.
   * - `reset-and-install` – Terminate + uninstall existing app (clearing data), then install.
   * - `blocked-mismatch`  – Install blocked due to fox_code identity mismatch.
   */
  readonly installAction:
    | 'reuse-installed'
    | 'install-new'
    | 'install-explicit'
    | 'reinstall'
    | 'reset-and-install'
    | 'blocked-mismatch';
}

/**
 * Metadata extracted from an iOS `.app` bundle's Info.plist.
 */
export interface IOSAppBundleMetadata {
  /** Absolute path to the resolved `.app` bundle directory. */
  appBundlePath: string;
  /** iOS application bundle identifier (CFBundleIdentifier). */
  bundleId: string;
  /** The `fox_code` plist key, used to distinguish production vs dev/e2e builds. */
  foxCode: string | null;
  /** CFBundleShortVersionString — user-facing version like "7.35.0". */
  shortVersion: string | null;
  /** CFBundleVersion — build number. */
  buildVersion: string | null;
}

/**
 * Error codes specific to iOS prerequisites and launch.
 * Mirror the package's MM_IOS_* convention.
 */
export type IOSLaunchErrorCode =
  | 'MM_IOS_RUNNER_NOT_READY'
  | 'MM_IOS_PREREQUISITES_FAILED'
  | 'MM_LAUNCH_FAILED'
  | 'MM_SESSION_ALREADY_RUNNING'
  | 'MM_IOS_APP_IDENTITY_MISMATCH';

export class IOSLaunchError extends Error {
  readonly code: IOSLaunchErrorCode;

  /** Optional remediation hint shown alongside the error message. */
  readonly remediation?: string;

  constructor(args: {
    code: IOSLaunchErrorCode;
    message: string;
    remediation?: string;
  }) {
    super(args.message);
    this.name = 'IOSLaunchError';
    this.code = args.code;
    this.remediation = args.remediation;
  }
}
