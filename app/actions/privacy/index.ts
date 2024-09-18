interface PrivacyAction {
  type: 'APPROVE_HOST' | 'REJECT_HOST' | 'RECORD_SRP_REVEAL_TIMESTAMP';
  hostname?: string;
  timestamp?: string;
}

export function approveHost(hostname: string): PrivacyAction {
  return {
    type: 'APPROVE_HOST',
    hostname,
  };
}

export function rejectHost(hostname: string): PrivacyAction {
  return {
    type: 'REJECT_HOST',
    hostname,
  };
}

export function recordSRPRevealTimestamp(timestamp: string): PrivacyAction {
  return {
    type: 'RECORD_SRP_REVEAL_TIMESTAMP',
    timestamp,
  };
}
