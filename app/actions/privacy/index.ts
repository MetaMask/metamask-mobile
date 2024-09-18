interface PrivacyAction {
  type: 'APPROVE_HOST' | 'REJECT_HOST' | 'RECORD_SRP_REVEAL_TIMESTAMP';
  hostname?: string;
  timestamp?: string;
}

// DEVIN_TODO: Confirm if 'hostname' can be null/undefined
export function approveHost(hostname: string): PrivacyAction {
  return {
    type: 'APPROVE_HOST',
    hostname,
  };
}

// DEVIN_TODO: Confirm if 'hostname' can be null/undefined
export function rejectHost(hostname: string): PrivacyAction {
  return {
    type: 'REJECT_HOST',
    hostname,
  };
}

// DEVIN_TODO: Confirm if 'timestamp' can be null/undefined
// DEVIN_TODO: Check if 'timestamp' should be a specific type (e.g., Unix timestamp)
export function recordSRPRevealTimestamp(timestamp: string): PrivacyAction {
  return {
    type: 'RECORD_SRP_REVEAL_TIMESTAMP',
    timestamp,
  };
}
