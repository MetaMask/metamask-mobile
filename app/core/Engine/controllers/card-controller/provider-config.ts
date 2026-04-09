import type { CardProviderId } from './provider-types';

/**
 * Standard shape for provider API configuration.
 * Each provider ships its own resolver that returns this shape.
 */
export interface CardProviderConfig {
  apiKey: string;
  baseUrl: string;
}

export type CardProviderConfigResolver = () => CardProviderConfig;

/**
 * Maps provider IDs to factory functions that create fully-configured
 * provider instances. Built at Engine init time in `cardControllerInit`.
 */
export type CardProviderFactoryMap = Record<
  CardProviderId,
  () => import('./provider-types').ICardProvider
>;
