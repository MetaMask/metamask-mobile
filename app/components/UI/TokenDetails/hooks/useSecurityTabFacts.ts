import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import type { SecurityTabFacts } from '../components/V1/SecurityTab/SecurityTab.types';
import type { TokenDetailsRouteParams } from '../constants/constants';
import {
  MOCK_SECURITY_FACTS_EVM,
  MOCK_SECURITY_FACTS_SOLANA,
} from '../mocks/tokenDetailsV1Mocks';

/**
 * Everything the Security surfaces render for a token, already formatted.
 *
 * The Security tab and the Contract security screen both call this rather than
 * reaching for a fixture themselves, which is what stops the two showing
 * different readings for the same token — the screen is reached from the tab,
 * so a disagreement would be visible in a single gesture.
 *
 * A hook rather than a plain function even though it currently derives
 * everything from the token: the real implementation has to call
 * `useTokenSecurityData`, so starting here means that swap changes this file
 * and nothing else.
 *
 * TODO(ASSETS-4022): return facts derived from `TokenSecurityData` instead of
 * the fixtures. The open questions blocking that are recorded on
 * `tokenDetailsV1Mocks`; none of them affect layout.
 */
export const useSecurityTabFacts = (
  token: TokenDetailsRouteParams,
): SecurityTabFacts =>
  isNonEvmChainId(token.chainId as string)
    ? MOCK_SECURITY_FACTS_SOLANA
    : MOCK_SECURITY_FACTS_EVM;
