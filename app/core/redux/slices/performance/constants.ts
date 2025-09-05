// Event name for the performance tracing:
export const PerformanceEventNames = {
  // When adding a Snap account.
  AddSnapAccount: 'ADD_SNAP_ACCOUNT',
  // When adding a HD account.
  AddHdAccount: 'ADD_HD_ACCOUNT',
  // When adding a token.
  AddToken: 'ADD_TOKEN',
  //When rehydrating the store.
  RehydrateStore: 'REHYDRATE_STORE',
  // When rehydrating Engine state from filesystem to Redux.
  EngineRehydrate: 'ENGINE_REHYDRATE',
  // End-to-end from Redux rehydration start until Engine filesystem rehydration completes.
  RehydrateEndToEnd: 'REHYDRATE_END_TO_END',
};
