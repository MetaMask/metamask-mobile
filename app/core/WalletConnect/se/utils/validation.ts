import { ProposalTypes, SessionTypes } from "@walletconnect/types";
import { normalizeNamespaces } from "@walletconnect/utils";
import { EVM_IDENTIFIER } from "../constants";
import { prefixChainWithNamespace } from "./transform";

export const validateProposalNamespaces = (proposal: ProposalTypes.Struct) => {
  if (
    // if the proposal contains non EVM namespaces
    Object.keys(proposal.requiredNamespaces).some((key) => key !== EVM_IDENTIFIER)
  ) {
    throw new Error("Invalid Session Proposal. Proposal contains non-EVM (`eip155`) namespaces.");
  }
};

export const validateProposalChains = (proposal: ProposalTypes.Struct) => {
  const normalizedRequired = normalizeNamespaces(proposal.requiredNamespaces);
  const normalizedOptional = normalizeNamespaces(proposal.optionalNamespaces);
  const requiredEip155 = normalizedRequired[EVM_IDENTIFIER]?.chains || [];
  const optionalEip155 = normalizedOptional[EVM_IDENTIFIER]?.chains || [];
  const proposedChains = [...requiredEip155, ...optionalEip155];

  if (requiredEip155.length > 1) {
    throw new Error("Invalid Session Proposal. More than one required `eip155` chain is proposed.");
  }

  if (!proposedChains.length) {
    throw new Error("Invalid Session Proposal. No `eip155` chain is proposed.");
  }
};

export const chainAlreadyInSession = (session: SessionTypes.Struct, chainId: number) => {
  return session.namespaces?.[EVM_IDENTIFIER]?.chains?.includes(prefixChainWithNamespace(chainId));
};

export const accountsAlreadyInSession = (session: SessionTypes.Struct, accounts: string[]) => {
  return accounts.some((account) =>
    session.namespaces?.[EVM_IDENTIFIER]?.accounts?.includes(account),
  );
};
