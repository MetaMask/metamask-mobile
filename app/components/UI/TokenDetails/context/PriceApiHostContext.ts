import { createContext, useContext } from 'react';
import { PRICE_API_BASE_URL } from '../../../../constants/urls';

/**
 * Prod is the default rather than a required value, which is what lets every
 * caller outside the provider — legacy Token Details, Social Leaderboard's
 * trader charts, Bridge's live rate — keep its current host without being
 * edited or even knowing this exists.
 */
export const PriceApiHostContext = createContext<string>(PRICE_API_BASE_URL);

/**
 * The Price API host for the current subtree, or the prod origin outside a
 * `PriceApiHostProvider`.
 *
 * Callers pass the result into their query options rather than reading it at
 * fetch time, so the host is part of the cache key and a change cannot serve
 * one environment's response under another's.
 *
 * Deliberately split from the provider: the four hooks that read this are
 * shared with Social Leaderboard, Bridge and the legacy page, and importing
 * the provider would drag the feature-flag selector graph into all of them.
 * This module depends on nothing but the constant.
 */
export const usePriceApiHost = (): string => useContext(PriceApiHostContext);
