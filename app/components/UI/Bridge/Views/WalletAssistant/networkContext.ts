import type { WalletAssistantResearchResponse } from './openai';

const ROBINHOOD_CHAIN_PATTERN = /\brobinhood\s+chain\b/i;
const ROBINHOOD_COMPANY_PATTERN =
  /\brobinhood\s+markets\b|\bhood(?:\s+stock|\s+equity|\s+shares?|\s*-related)?\b|\btokenized\s+(?:stock|equity)\b/i;

export const ROBINHOOD_CHAIN_CONTEXT_INSTRUCTIONS = `
Network context:
- "Robinhood Chain" means the EVM blockchain network with chain ID 4663 (0x1237).
- It does not mean Robinhood Markets, the HOOD stock, tokenized HOOD equity, or company-related tokens.
- When the user asks for tokens on Robinhood Chain, only consider assets deployed on eip155:4663.
- Exclude stocks and tokenized equities unless the user explicitly asks for them.
- Never substitute a similarly named company, ticker, or asset when network-specific results are unavailable. State the limitation instead.
`.trim();

export const ROBINHOOD_CHAIN_RETRY_INSTRUCTIONS = `
Correction required: the request is about tokens deployed on Robinhood Chain
(eip155:4663), not Robinhood Markets or HOOD. Start the research again with
that network constraint. Exclude stocks, tokenized equities, and company-related
assets. Do not mention HOOD unless the user explicitly asks for it.
`.trim();

export const getNetworkContextInstructions = (prompt: string) =>
  ROBINHOOD_CHAIN_PATTERN.test(prompt)
    ? ROBINHOOD_CHAIN_CONTEXT_INSTRUCTIONS
    : '';

export const hasNetworkContextMismatch = (
  prompt: string,
  research: WalletAssistantResearchResponse,
) => {
  if (!ROBINHOOD_CHAIN_PATTERN.test(prompt)) {
    return false;
  }

  const responseText = [
    research.title,
    research.summary,
    ...research.tokens,
    ...research.sections.flatMap((section) => [
      section.heading,
      ...section.bullets,
    ]),
  ].join(' ');

  return ROBINHOOD_COMPANY_PATTERN.test(responseText);
};
