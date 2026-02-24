import type { SessionData } from '../types';
import { createLogger } from '../../framework/logger';

/**
 * Interface for provider-agnostic session data enrichment.
 * Implement this interface to add a new provider (e.g., AWS Device Farm, Sauce Labs).
 */
export interface ISessionDataEnricher {
  /** Enrich a session with provider-specific data (video URL, profiling, network logs). */
  enrichSession(session: SessionData): Promise<void>;
  /** Return true if this enricher handles sessions for the given project name. */
  canHandle(projectName: string): boolean;
  /** Return the provider name for logging purposes. */
  getProviderName(): string;
}

/**
 * Abstract base class with shared logging for session data enrichers.
 */
export abstract class BaseSessionDataEnricher implements ISessionDataEnricher {
  protected logger;

  constructor(providerName: string) {
    this.logger = createLogger({ name: `${providerName}Enricher` });
  }

  abstract enrichSession(session: SessionData): Promise<void>;
  abstract canHandle(projectName: string): boolean;
  abstract getProviderName(): string;
}
