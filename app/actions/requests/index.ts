export function recordRejectionToRequestFromOrigin(origin: string) {
  return {
    type: 'RECORD_REJECTION_TO_REQUEST_FROM_ORIGIN',
    origin,
  };
}

export function resetRejectionToRequestFromOrigin(origin: string) {
  return {
    type: 'RESET_REJECTIONS_TO_REQUEST_FROM_ORIGIN',
    origin,
  };
}

export function resetAllRejectionToRequest() {
  return {
    type: 'RESET_ALL_REJECTIONS_TO_REQUEST',
  };
}
