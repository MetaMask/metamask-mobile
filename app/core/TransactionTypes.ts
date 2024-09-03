interface CustomGas {
  AVERAGE_GAS: number;
  LOW_GAS: number;
  FAST_GAS: number;
  DEFAULT_GAS_LIMIT: string;
}

interface Asset {
  ETH: string;
  ERC20: string;
  ERC721: string;
  ERC1155: string;
}

interface TransactionTypes {
  CUSTOM_GAS: CustomGas;
  ASSET: Asset;
  MMM: string;
  MM: string;
}

const TransactionTypes: TransactionTypes = {
  CUSTOM_GAS: {
    AVERAGE_GAS: 20,
    LOW_GAS: 10,
    FAST_GAS: 40,
    DEFAULT_GAS_LIMIT: '0x5208',
  },
  ASSET: {
    ETH: 'ETH',
    ERC20: 'ERC20',
    ERC721: 'ERC721',
    ERC1155: 'ERC1155',
  },
  MMM: 'MetaMask Mobile',
  MM: 'metamask',
};

export default TransactionTypes;
