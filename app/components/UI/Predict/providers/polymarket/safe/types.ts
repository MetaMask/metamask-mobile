export enum OperationType {
  Call, // 0
  DelegateCall, // 1
}

export interface SafeTransaction {
  to: string;
  operation: OperationType;
  data: string;
  value: string;
}

export interface SplitSignature {
  r: string;
  s: string;
  v: string;
}

export interface SafeFeeAuthorization {
  type: 'safe-transaction';
  authorization: {
    tx: SafeTransaction; // Safe transaction
    sig: string; // Signature of the Safe transaction
  };
}

export interface Permit2FeeAuthorization {
  type: 'safe-permit2';
  authorization: {
    permit: {
      permitted: { token: string; amount: string };
      nonce: string;
      deadline: string;
    };
    spender: string;
    signature: string;
  };
}
