/**
 * The name types supported by the NameController.
 *
 * todo: replace this with the actual NameType enum from the NameController.
 */
export enum NameType {
  /** The value of an Ethereum account. */
  EthereumAddress = 'EthereumAddress',
}

export interface NameProperties {
  type: NameType;
  value: string;
}
