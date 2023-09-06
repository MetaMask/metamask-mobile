export function approveHost(hostname) {
  return {
    type: 'APPROVE_HOST',
    hostname,
  };
}

export function rejectHost(hostname) {
  return {
    type: 'REJECT_HOST',
    hostname,
  };
}

export function recordSRPRevealTimestamp(timestamp) {
  return {
    type: 'RECORD_SRP_REVEAL_TIMESTAMP',
    timestamp,
  };
}
