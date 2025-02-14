import { ProposalTypes, SessionTypes } from "@walletconnect/types";
import { EVM_IDENTIFIER } from "../constants";

export const isCaipFormatted = (payload: string) => {
  return payload.includes(EVM_IDENTIFIER);
};

export const parseChains = (chains: string[]) => {
  return chains.map((chain) => parseChain(chain));
};

export const parseChain = (chain: string) => {
  return isCaipFormatted(chain) ? chain.split(":")[1] : chain;
};

export const prefixChainWithNamespace = (chain: number) => {
  return `${EVM_IDENTIFIER}:${chain}`;
};

export const formatAccounts = (accounts: string[], chain: number) => {
  return accounts.map((account) => `${EVM_IDENTIFIER}:${chain}:${account}`);
};

export const parseAccount = (account: string) => {
  return isCaipFormatted(account) ? account.split(":")[2] : account;
};

export const parseAccounts = (accounts: string[]) => {
  return accounts.map((account) => parseAccount(account));
};

export const parseSessions = (sessions: SessionTypes.Struct[]) => {
  return sessions.reduce((sessionsMapping: Record<string, SessionTypes.Struct>, session) => {
    const parsedSession: SessionTypes.Struct = cloneObject(session);
    const chains = session.namespaces[EVM_IDENTIFIER].chains || [];
    const accounts = session.namespaces[EVM_IDENTIFIER].accounts;
    parsedSession.namespaces[EVM_IDENTIFIER].chains = parseChains(chains);
    parsedSession.namespaces[EVM_IDENTIFIER].accounts = parseAccounts(accounts);
    sessionsMapping[session.topic] = parsedSession;
    return sessionsMapping;
  }, {});
};

export const parseProposal = (proposal: ProposalTypes.Struct) => {
  const parsedProposal = cloneObject(proposal);
  const chains = proposal.requiredNamespaces?.[EVM_IDENTIFIER]?.chains || [];
  const optionalChains = proposal.optionalNamespaces?.[EVM_IDENTIFIER]?.chains || [];
  if (parsedProposal.requiredNamespaces?.[EVM_IDENTIFIER]) {
    parsedProposal.requiredNamespaces[EVM_IDENTIFIER].chains = parseChains(chains);
  }
  if (parsedProposal.optionalNamespaces?.[EVM_IDENTIFIER]) {
    parsedProposal.optionalNamespaces[EVM_IDENTIFIER].chains = parseChains(optionalChains);
  }
  return parsedProposal;
};

export const parseProposals = (proposals: ProposalTypes.Struct[]) => {
  return proposals.map((proposal) => parseProposal(proposal));
};

export const cloneObject = (obj: any) => {
  return JSON.parse(JSON.stringify(obj));
};

export const formatAuthAddress = (address: string) => {
  return address.includes("did:pkh") ? address : `did:pkh:eip155:1:${address}`;
};
