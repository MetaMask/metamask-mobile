/**
 * Metadata about the dApp and SDK that is requesting the connection.
 */
export interface Metadata {
  dapp: {
    name: string;
    url: string;
    icon?: string;
  };
  sdk: {
    version: string;
    platform: string;
  };
}
