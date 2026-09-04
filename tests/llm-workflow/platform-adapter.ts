import type {
  IPlatformDriver,
  SessionLaunchInput,
  SessionLaunchResult,
} from '@metamask/client-mcp-core';

export type MobilePlatform = 'ios' | 'android';

export interface ResolvedMobileLaunchOptions {
  readonly platform: MobilePlatform;
  readonly deviceId: string;
  readonly appId: string;
  readonly appPath: string;
  readonly metroPort?: number;
  readonly metadataLines: readonly string[];
}

export interface LaunchedMobileSession {
  readonly driver: IPlatformDriver;
  readonly state: SessionLaunchResult['state'];
}

export interface MobilePlatformAdapter {
  resolve(
    input: SessionLaunchInput,
    metroPort?: number,
  ): Promise<ResolvedMobileLaunchOptions>;
  launch(resolved: ResolvedMobileLaunchOptions): Promise<LaunchedMobileSession>;
  cleanup(): Promise<void>;
}
