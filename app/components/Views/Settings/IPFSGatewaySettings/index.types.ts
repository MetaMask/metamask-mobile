/**
 * Represents an IPFS gateway configuration.
 * @interface Gateway
 * @property {number} key - Unique identifier for the gateway.
 * @property {string} value - URL or address of the IPFS gateway.
 * @property {string} label - Human-readable name or description for the gateway, used in the UI.
 */
export interface Gateway {
  key: number;
  value: string;
  label: string;
}
