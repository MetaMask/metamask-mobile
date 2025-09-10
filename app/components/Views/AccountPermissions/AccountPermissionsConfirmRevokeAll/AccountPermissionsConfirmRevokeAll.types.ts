export interface AccountPermissionsConfirmRevokeAllParams {
  hostInfo: {
    metadata: { origin: string };
  };
  onRevokeAll?: () => void;
}
