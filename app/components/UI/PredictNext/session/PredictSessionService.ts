import { Observable } from './Observable';
import type {
  AccountSetupStepPayload,
  PredictAccountReadiness,
  PredictAccountSetupState,
  PredictVenueId,
  PredictVenueSession,
} from '../types';
import { PredictError, PredictErrorCode } from '../types/errors';
import type { PredictClient, VenueAdapter } from '../adapters/types';
import type { BackendClient } from '../api/backendClient';
import { KalshiAdapter } from '../adapters/kalshi/KalshiAdapter';

/**
 * Session + readiness + account-setup workflow for the POC.
 *
 * Holds:
 *   - a single active VenueAdapter (KalshiAdapter for the POC)
 *   - the current PredictVenueSession (created on first getClient call)
 *   - PredictAccountReadiness, refreshed via the adapter
 *   - PredictAccountSetupState — driven by the canonical step renderer
 *
 * Exposes `getClient(ownerAddress)` returning a PredictClient — a session-bound
 * view of the adapter where the trailing session parameter is auto-injected.
 */

export interface PredictSessionState {
  ownerAddress?: string;
  session?: PredictVenueSession;
  readiness?: PredictAccountReadiness;
  setup: PredictAccountSetupState;
  setupError?: { code: string; message: string };
  isSubmittingStep: boolean;
}

const INITIAL_SETUP: PredictAccountSetupState = {
  setupStep: 'email_otp',
  kycApproved: false,
};

const INITIAL_STATE: PredictSessionState = {
  setup: INITIAL_SETUP,
  isSubmittingStep: false,
};

export class PredictSessionService extends Observable<PredictSessionState> {
  private readonly adapter: VenueAdapter;
  constructor(private readonly client: BackendClient, adapter?: VenueAdapter) {
    super(INITIAL_STATE);
    this.adapter = adapter ?? new KalshiAdapter(client);
  }

  async getClient(
    ownerAddress: string,
    venueId: PredictVenueId = 'kalshi',
  ): Promise<PredictClient> {
    if (venueId !== this.adapter.venueId) {
      throw new PredictError(
        PredictErrorCode.UNSUPPORTED_VENUE_CAPABILITY,
        `venue ${venueId} not configured`,
      );
    }
    let { session } = this.getState();
    if (!session || session.ownerAddress !== ownerAddress) {
      session = await this.adapter.createSession({ ownerAddress });
      this.setState((prev) => ({ ...prev, ownerAddress, session }));
    }
    return this.bindClient(this.adapter, session);
  }

  invalidate(): void {
    this.setState((prev) => ({ ...prev, session: undefined, readiness: undefined }));
  }

  async refreshReadiness(ownerAddress: string): Promise<PredictAccountReadiness> {
    const session = await this.ensureSession(ownerAddress);
    const readiness = await this.adapter.fetchAccountReadiness(undefined, session);
    this.setState((prev) => ({ ...prev, readiness }));
    return readiness;
  }

  // ===== Account Setup workflow =====================================

  async startAccountSetup(params: { ownerAddress: string; email: string }): Promise<void> {
    this.client.setExternalUserId(params.ownerAddress);
    this.setState((prev) => ({ ...prev, isSubmittingStep: true, setupError: undefined }));
    try {
      const response = await this.client.post<{
        setupStep: PredictAccountSetupState['setupStep'];
        kalshiUserId?: string;
        linkId?: string;
        obfuscatedDestination?: string;
      }>('/predict/v1/kalshi/account/setup/start', { email: params.email });
      this.setState((prev) => ({
        ...prev,
        ownerAddress: params.ownerAddress,
        isSubmittingStep: false,
        setup: {
          setupStep: response.setupStep,
          kycApproved: response.setupStep === 'complete',
          kalshiUserId: response.kalshiUserId,
          path: response.linkId ? 'B' : 'A',
          linkId: response.linkId,
          obfuscatedDestination: response.obfuscatedDestination,
        },
      }));
    } catch (err) {
      this.captureError(err);
      throw err;
    }
  }

  async submitAccountSetupStep(
    ownerAddress: string,
    payload: AccountSetupStepPayload,
  ): Promise<void> {
    this.client.setExternalUserId(ownerAddress);
    this.setState((prev) => ({ ...prev, isSubmittingStep: true, setupError: undefined }));
    try {
      const response = await this.client.post<{
        setupStep: PredictAccountSetupState['setupStep'];
        linkId?: string;
        obfuscatedDestination?: string;
      }>('/predict/v1/kalshi/account/setup/step', payload);
      this.setState((prev) => ({
        ...prev,
        isSubmittingStep: false,
        setup: {
          ...prev.setup,
          setupStep: response.setupStep,
          kycApproved: response.setupStep === 'complete',
          linkId: response.linkId ?? prev.setup.linkId,
          obfuscatedDestination:
            response.obfuscatedDestination ?? prev.setup.obfuscatedDestination,
        },
      }));
      if (response.setupStep === 'complete') {
        // Refresh readiness now that the per-user PEM exists.
        await this.refreshReadiness(ownerAddress).catch(() => undefined);
      }
    } catch (err) {
      this.captureError(err);
      throw err;
    }
  }

  async resumeAccountSetup(ownerAddress: string): Promise<void> {
    this.client.setExternalUserId(ownerAddress);
    const response = await this.client.get<{
      setupStep: PredictAccountSetupState['setupStep'];
      kycApproved: boolean;
      kalshiUserId?: string;
      path?: 'A' | 'B';
    }>('/predict/v1/kalshi/account/setup/status');
    this.setState((prev) => ({
      ...prev,
      ownerAddress,
      setup: {
        setupStep: response.setupStep,
        kycApproved: response.kycApproved,
        kalshiUserId: response.kalshiUserId,
        path: response.path,
      },
    }));
  }

  // ===== Internal helpers ===========================================

  private async ensureSession(ownerAddress: string): Promise<PredictVenueSession> {
    let { session } = this.getState();
    if (!session || session.ownerAddress !== ownerAddress) {
      session = await this.adapter.createSession({ ownerAddress });
      this.setState((prev) => ({ ...prev, ownerAddress, session }));
    }
    return session;
  }

  private captureError(err: unknown): void {
    const message = err instanceof Error ? err.message : 'unknown error';
    const code = err instanceof PredictError ? err.code : PredictErrorCode.UNKNOWN_ERROR;
    this.setState((prev) => ({
      ...prev,
      isSubmittingStep: false,
      setupError: { code, message },
    }));
  }

  private bindClient(
    adapter: VenueAdapter,
    session: PredictVenueSession,
  ): PredictClient {
    const bound = {
      venueId: adapter.venueId,
      capabilities: adapter.capabilities,
      getVenueInfo: () => adapter.getVenueInfo(),
    } as Record<string, unknown>;
    // Auto-wrap every adapter method so callers don't pass `session`.
    const proto = Object.getPrototypeOf(adapter) as Record<string, unknown>;
    const protoNames = Object.getOwnPropertyNames(proto);
    for (const name of protoNames) {
      if (name === 'constructor') continue;
      const value = (adapter as unknown as Record<string, unknown>)[name];
      if (typeof value !== 'function') continue;
      // getVenueInfo: pure read, no session needed. createSession: produces a
      // session and isn't exposed through the bound client surface.
      if (name === 'getVenueInfo' || name === 'createSession') continue;
      bound[name] = (...args: unknown[]) =>
        (value as (...args: unknown[]) => unknown).call(adapter, ...args, session);
    }
    return bound as unknown as PredictClient;
  }
}
