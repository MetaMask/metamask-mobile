import { PerpsMarketIconData } from '../types';

// Complete icon mapping for all Hyperliquid markets
export const HYPERLIQUID_ICONS: Record<string, PerpsMarketIconData> = {
  // Major Cryptocurrencies
  BTC: {
    symbol: 'BTC',
    iconUrl: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    coinGeckoId: 'bitcoin',
    category: 'major',
  },
  ETH: {
    symbol: 'ETH',
    iconUrl: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    coinGeckoId: 'ethereum',
    category: 'major',
  },
  SOL: {
    symbol: 'SOL',
    iconUrl: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    coinGeckoId: 'solana',
    category: 'layer1',
  },
  AVAX: {
    symbol: 'AVAX',
    iconUrl:
      'https://assets.coingecko.com/coins/images/12559/large/avalanche-avax-logo.png',
    coinGeckoId: 'avalanche-2',
    category: 'layer1',
  },
  DOT: {
    symbol: 'DOT',
    iconUrl:
      'https://assets.coingecko.com/coins/images/12171/large/polkadot.png',
    coinGeckoId: 'polkadot',
    category: 'layer1',
  },
  ADA: {
    symbol: 'ADA',
    iconUrl: 'https://assets.coingecko.com/coins/images/975/large/cardano.png',
    coinGeckoId: 'cardano',
    category: 'layer1',
  },
  LTC: {
    symbol: 'LTC',
    iconUrl: 'https://assets.coingecko.com/coins/images/2/large/litecoin.png',
    coinGeckoId: 'litecoin',
    category: 'major',
  },
  BCH: {
    symbol: 'BCH',
    iconUrl:
      'https://assets.coingecko.com/coins/images/780/large/bitcoin-cash-circle.png',
    coinGeckoId: 'bitcoin-cash',
    category: 'major',
  },
  XRP: {
    symbol: 'XRP',
    iconUrl:
      'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
    coinGeckoId: 'ripple',
    category: 'major',
  },

  // Stablecoins & Gold
  PAXG: {
    symbol: 'PAXG',
    iconUrl: 'https://assets.coingecko.com/coins/images/9519/large/paxgold.png',
    coinGeckoId: 'pax-gold',
    category: 'stablecoin',
  },

  // DeFi Tokens
  AAVE: {
    symbol: 'AAVE',
    iconUrl: 'https://assets.coingecko.com/coins/images/12645/large/AAVE.png',
    coinGeckoId: 'aave',
    category: 'defi',
  },
  CRV: {
    symbol: 'CRV',
    iconUrl: 'https://assets.coingecko.com/coins/images/12124/large/Curve.png',
    coinGeckoId: 'curve-dao-token',
    category: 'defi',
  },
  ONDO: {
    symbol: 'ONDO',
    iconUrl: 'https://assets.coingecko.com/coins/images/26580/large/ONDO.png',
    coinGeckoId: 'ondo-finance',
    category: 'defi',
  },
  LINK: {
    symbol: 'LINK',
    iconUrl:
      'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
    coinGeckoId: 'chainlink',
    category: 'defi',
  },
  UNI: {
    symbol: 'UNI',
    iconUrl:
      'https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png',
    coinGeckoId: 'uniswap',
    category: 'defi',
  },
  COMP: {
    symbol: 'COMP',
    iconUrl: 'https://assets.coingecko.com/coins/images/10775/large/COMP.png',
    coinGeckoId: 'compound',
    category: 'defi',
  },
  MKR: {
    symbol: 'MKR',
    iconUrl:
      'https://assets.coingecko.com/coins/images/1364/large/Mark_Maker.png',
    coinGeckoId: 'maker',
    category: 'defi',
  },
  LDO: {
    symbol: 'LDO',
    iconUrl:
      'https://assets.coingecko.com/coins/images/13573/large/Lido_DAO.png',
    coinGeckoId: 'lido-dao',
    category: 'defi',
  },
  SNX: {
    symbol: 'SNX',
    iconUrl: 'https://assets.coingecko.com/coins/images/3406/large/SNX.png',
    coinGeckoId: 'havven',
    category: 'defi',
  },
  SUSHI: {
    symbol: 'SUSHI',
    iconUrl:
      'https://assets.coingecko.com/coins/images/12271/large/512x512_Logo_no_chop.png',
    coinGeckoId: 'sushi',
    category: 'defi',
  },
  MORPHO: {
    symbol: 'MORPHO',
    iconUrl: 'https://assets.coingecko.com/coins/images/34129/large/morpho.png',
    coinGeckoId: 'morpho-token',
    category: 'defi',
  },
  PENDLE: {
    symbol: 'PENDLE',
    iconUrl:
      'https://assets.coingecko.com/coins/images/15069/large/Pendle_Logo_Normal-03.png',
    coinGeckoId: 'pendle',
    category: 'defi',
  },
  BLUR: {
    symbol: 'BLUR',
    iconUrl: 'https://assets.coingecko.com/coins/images/28453/large/blur.png',
    coinGeckoId: 'blur',
    category: 'defi',
  },
  ENA: {
    symbol: 'ENA',
    iconUrl: 'https://assets.coingecko.com/coins/images/36530/large/ethena.png',
    coinGeckoId: 'ethena',
    category: 'defi',
  },
  EIGEN: {
    symbol: 'EIGEN',
    iconUrl: 'https://assets.coingecko.com/coins/images/37024/large/eigen.png',
    coinGeckoId: 'eigenlayer',
    category: 'defi',
  },
  ETHFI: {
    symbol: 'ETHFI',
    iconUrl:
      'https://assets.coingecko.com/coins/images/35958/large/etherfi.png',
    coinGeckoId: 'ether-fi',
    category: 'defi',
  },

  // Meme Coins
  DOGE: {
    symbol: 'DOGE',
    iconUrl: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
    coinGeckoId: 'dogecoin',
    category: 'meme',
  },
  kPEPE: {
    symbol: 'kPEPE',
    iconUrl:
      'https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg',
    coinGeckoId: 'pepe',
    category: 'meme',
  },
  kBONK: {
    symbol: 'kBONK',
    iconUrl: 'https://assets.coingecko.com/coins/images/28600/large/bonk.jpg',
    coinGeckoId: 'bonk',
    category: 'meme',
  },
  kFLOKI: {
    symbol: 'kFLOKI',
    iconUrl:
      'https://assets.coingecko.com/coins/images/16746/large/PNG_image.png',
    coinGeckoId: 'floki',
    category: 'meme',
  },
  kSHIB: {
    symbol: 'kSHIB',
    iconUrl: 'https://assets.coingecko.com/coins/images/11939/large/shiba.png',
    coinGeckoId: 'shiba-inu',
    category: 'meme',
  },
  WIF: {
    symbol: 'WIF',
    iconUrl:
      'https://assets.coingecko.com/coins/images/33767/large/dogwifhat.jpg',
    coinGeckoId: 'dogwifcoin',
    category: 'meme',
  },
  GOAT: {
    symbol: 'GOAT',
    iconUrl:
      'https://assets.coingecko.com/coins/images/33696/large/Goatseus_Maximus.jpg',
    coinGeckoId: 'goatseus-maximus',
    category: 'meme',
  },
  CHILLGUY: {
    symbol: 'CHILLGUY',
    iconUrl:
      'https://assets.coingecko.com/coins/images/33687/large/photo_2024-11-15_17-01-30.jpg',
    coinGeckoId: 'just-a-chill-guy',
    category: 'meme',
  },
  POPCAT: {
    symbol: 'POPCAT',
    iconUrl: 'https://assets.coingecko.com/coins/images/30323/large/popcat.png',
    coinGeckoId: 'popcat',
    category: 'meme',
  },
  MOODENG: {
    symbol: 'MOODENG',
    iconUrl:
      'https://assets.coingecko.com/coins/images/32473/large/moodeng.webp',
    coinGeckoId: 'moo-deng',
    category: 'meme',
  },
  PNUT: {
    symbol: 'PNUT',
    iconUrl:
      'https://assets.coingecko.com/coins/images/33439/large/peanut-the-squirrel.png',
    coinGeckoId: 'peanut-the-squirrel',
    category: 'meme',
  },
  MEW: {
    symbol: 'MEW',
    iconUrl: 'https://assets.coingecko.com/coins/images/36478/large/mew.png',
    coinGeckoId: 'cat-in-a-dogs-world',
    category: 'meme',
  },
  TURBO: {
    symbol: 'TURBO',
    iconUrl: 'https://assets.coingecko.com/coins/images/30059/large/turbos.png',
    coinGeckoId: 'turbo',
    category: 'meme',
  },
  BOME: {
    symbol: 'BOME',
    iconUrl: 'https://assets.coingecko.com/coins/images/35547/large/book.png',
    coinGeckoId: 'book-of-meme',
    category: 'meme',
  },
  FARTCOIN: {
    symbol: 'FARTCOIN',
    iconUrl:
      'https://assets.coingecko.com/coins/images/34629/large/fartcoin.png',
    coinGeckoId: 'fartcoin',
    category: 'meme',
  },
  NOT: {
    symbol: 'NOT',
    iconUrl: 'https://assets.coingecko.com/coins/images/35119/large/not.png',
    coinGeckoId: 'notcoin',
    category: 'meme',
  },
  BRETT: {
    symbol: 'BRETT',
    iconUrl: 'https://assets.coingecko.com/coins/images/35464/large/brett.png',
    coinGeckoId: 'based-brett',
    category: 'meme',
  },
  GALA: {
    symbol: 'GALA',
    iconUrl:
      'https://assets.coingecko.com/coins/images/12493/large/GALA-v2.png',
    coinGeckoId: 'gala',
    category: 'gaming',
  },
  PENGU: {
    symbol: 'PENGU',
    iconUrl: 'https://assets.coingecko.com/coins/images/37430/large/pengu.png',
    coinGeckoId: 'pudgy-penguins',
    category: 'meme',
  },
  MEME: {
    symbol: 'MEME',
    iconUrl:
      'https://assets.coingecko.com/coins/images/32537/large/memecoin.png',
    coinGeckoId: 'memecoin',
    category: 'meme',
  },
  ANIME: {
    symbol: 'ANIME',
    iconUrl: 'https://assets.coingecko.com/coins/images/33399/large/anime.png',
    coinGeckoId: 'anime',
    category: 'meme',
  },
  BABY: {
    symbol: 'BABY',
    iconUrl: 'https://assets.coingecko.com/coins/images/34127/large/baby.png',
    coinGeckoId: 'baby-doge-coin',
    category: 'meme',
  },
  kNEIRO: {
    symbol: 'kNEIRO',
    iconUrl: 'https://assets.coingecko.com/coins/images/32799/large/neiro.png',
    coinGeckoId: 'neiro-ethereum',
    category: 'meme',
  },
  NEIROETH: {
    symbol: 'NEIROETH',
    iconUrl: 'https://assets.coingecko.com/coins/images/32799/large/neiro.png',
    coinGeckoId: 'neiro-ethereum',
    category: 'meme',
  },
  kLUNC: {
    symbol: 'kLUNC',
    iconUrl:
      'https://assets.coingecko.com/coins/images/8284/large/luna1557227471663.png',
    coinGeckoId: 'terra-luna',
    category: 'other',
  },
  kDOGS: {
    symbol: 'kDOGS',
    iconUrl: 'https://assets.coingecko.com/coins/images/34105/large/dogs.png',
    coinGeckoId: 'dogs',
    category: 'meme',
  },
  HMSTR: {
    symbol: 'HMSTR',
    iconUrl:
      'https://assets.coingecko.com/coins/images/34079/large/hamster.png',
    coinGeckoId: 'hamster-kombat',
    category: 'gaming',
  },

  // Layer 1 & Layer 2
  TRX: {
    symbol: 'TRX',
    iconUrl:
      'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png',
    coinGeckoId: 'tron',
    category: 'layer1',
  },
  ARB: {
    symbol: 'ARB',
    iconUrl:
      'https://assets.coingecko.com/coins/images/16547/large/photo_2023-03-29_21.47.00.jpeg',
    coinGeckoId: 'arbitrum',
    category: 'layer2',
  },
  OP: {
    symbol: 'OP',
    iconUrl:
      'https://assets.coingecko.com/coins/images/25244/large/Optimism.png',
    coinGeckoId: 'optimism',
    category: 'layer2',
  },
  POL: {
    symbol: 'POL',
    iconUrl:
      'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png',
    coinGeckoId: 'matic-network',
    category: 'layer2',
  },
  BNB: {
    symbol: 'BNB',
    iconUrl:
      'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
    coinGeckoId: 'binancecoin',
    category: 'layer1',
  },
  SUI: {
    symbol: 'SUI',
    iconUrl: 'https://assets.coingecko.com/coins/images/26375/large/sui.png',
    coinGeckoId: 'sui',
    category: 'layer1',
  },
  NEAR: {
    symbol: 'NEAR',
    iconUrl:
      'https://assets.coingecko.com/coins/images/10365/large/near_icon.png',
    coinGeckoId: 'near',
    category: 'layer1',
  },
  APT: {
    symbol: 'APT',
    iconUrl:
      'https://assets.coingecko.com/coins/images/26455/large/aptos_round.png',
    coinGeckoId: 'aptos',
    category: 'layer1',
  },
  SEI: {
    symbol: 'SEI',
    iconUrl:
      'https://assets.coingecko.com/coins/images/28205/large/Sei_Logo_-_Transparent.png',
    coinGeckoId: 'sei-network',
    category: 'layer1',
  },
  TON: {
    symbol: 'TON',
    iconUrl:
      'https://assets.coingecko.com/coins/images/17980/large/ton_symbol.png',
    coinGeckoId: 'the-open-network',
    category: 'layer1',
  },
  ATOM: {
    symbol: 'ATOM',
    iconUrl:
      'https://assets.coingecko.com/coins/images/1481/large/cosmos_hub.png',
    coinGeckoId: 'cosmos',
    category: 'layer1',
  },
  TIA: {
    symbol: 'TIA',
    iconUrl: 'https://assets.coingecko.com/coins/images/31967/large/tia.jpg',
    coinGeckoId: 'celestia',
    category: 'layer1',
  },
  INJ: {
    symbol: 'INJ',
    iconUrl:
      'https://assets.coingecko.com/coins/images/12882/large/Secondary_Symbol.png',
    coinGeckoId: 'injective-protocol',
    category: 'layer1',
  },
  STRK: {
    symbol: 'STRK',
    iconUrl:
      'https://assets.coingecko.com/coins/images/35432/large/starknet.png',
    coinGeckoId: 'starknet',
    category: 'layer2',
  },
  STX: {
    symbol: 'STX',
    iconUrl:
      'https://assets.coingecko.com/coins/images/2069/large/Stacks_logo_full.png',
    coinGeckoId: 'blockstack',
    category: 'layer1',
  },
  MANTA: {
    symbol: 'MANTA',
    iconUrl: 'https://assets.coingecko.com/coins/images/33613/large/manta.png',
    coinGeckoId: 'manta-network',
    category: 'layer2',
  },
  BLAST: {
    symbol: 'BLAST',
    iconUrl: 'https://assets.coingecko.com/coins/images/35494/large/blast.png',
    coinGeckoId: 'blast',
    category: 'layer2',
  },
  ZK: {
    symbol: 'ZK',
    iconUrl: 'https://assets.coingecko.com/coins/images/37007/large/zksync.png',
    coinGeckoId: 'zksync',
    category: 'layer2',
  },

  // AI & Tech
  RENDER: {
    symbol: 'RENDER',
    iconUrl: 'https://assets.coingecko.com/coins/images/11636/large/rndr.png',
    coinGeckoId: 'render-token',
    category: 'ai',
  },
  FET: {
    symbol: 'FET',
    iconUrl: 'https://assets.coingecko.com/coins/images/5681/large/Fetch.jpg',
    coinGeckoId: 'fetch-ai',
    category: 'ai',
  },
  TAO: {
    symbol: 'TAO',
    iconUrl:
      'https://assets.coingecko.com/coins/images/33180/large/bittensor.png',
    coinGeckoId: 'bittensor',
    category: 'ai',
  },
  AIXBT: {
    symbol: 'AIXBT',
    iconUrl: 'https://assets.coingecko.com/coins/images/34092/large/aixbt.png',
    coinGeckoId: 'aixbt-by-virtuals',
    category: 'ai',
  },
  VIRTUAL: {
    symbol: 'VIRTUAL',
    iconUrl:
      'https://assets.coingecko.com/coins/images/34014/large/virtuals.png',
    coinGeckoId: 'virtuals-protocol',
    category: 'ai',
  },
  AI16Z: {
    symbol: 'AI16Z',
    iconUrl: 'https://assets.coingecko.com/coins/images/34118/large/ai16z.png',
    coinGeckoId: 'ai16z',
    category: 'ai',
  },
  ZEREBRO: {
    symbol: 'ZEREBRO',
    iconUrl:
      'https://assets.coingecko.com/coins/images/34043/large/zerebro.png',
    coinGeckoId: 'zerebro',
    category: 'ai',
  },

  // Oracles & Data
  PYTH: {
    symbol: 'PYTH',
    iconUrl: 'https://assets.coingecko.com/coins/images/31833/large/pyth.png',
    coinGeckoId: 'pyth-network',
    category: 'defi',
  },
  TRB: {
    symbol: 'TRB',
    iconUrl: 'https://assets.coingecko.com/coins/images/9644/large/Tellor.png',
    coinGeckoId: 'tellor',
    category: 'defi',
  },

  // Gaming & NFT
  IMX: {
    symbol: 'IMX',
    iconUrl:
      'https://assets.coingecko.com/coins/images/17233/large/immutableX-symbol-BLK-RGB.png',
    coinGeckoId: 'immutable-x',
    category: 'gaming',
  },
  SAND: {
    symbol: 'SAND',
    iconUrl:
      'https://assets.coingecko.com/coins/images/12129/large/sandbox_logo.jpg',
    coinGeckoId: 'the-sandbox',
    category: 'gaming',
  },
  APE: {
    symbol: 'APE',
    iconUrl:
      'https://assets.coingecko.com/coins/images/24383/large/apecoin.jpg',
    coinGeckoId: 'apecoin',
    category: 'gaming',
  },
  ENS: {
    symbol: 'ENS',
    iconUrl:
      'https://assets.coingecko.com/coins/images/19785/large/acatxTm8_400x400.jpg',
    coinGeckoId: 'ethereum-name-service',
    category: 'defi',
  },
  YGG: {
    symbol: 'YGG',
    iconUrl:
      'https://assets.coingecko.com/coins/images/17358/large/icon_YGG.png',
    coinGeckoId: 'yield-guild-games',
    category: 'gaming',
  },

  // Specialized/Other
  HYPE: {
    symbol: 'HYPE',
    iconUrl:
      'https://assets.coingecko.com/coins/images/34503/large/hyperliquid.jpg',
    coinGeckoId: 'hyperliquid',
    category: 'layer1',
  },
  WLD: {
    symbol: 'WLD',
    iconUrl:
      'https://assets.coingecko.com/coins/images/31069/large/worldcoin.jpeg',
    coinGeckoId: 'worldcoin-wld',
    category: 'other',
  },
  FIL: {
    symbol: 'FIL',
    iconUrl:
      'https://assets.coingecko.com/coins/images/12817/large/filecoin.png',
    coinGeckoId: 'filecoin',
    category: 'other',
  },
  AR: {
    symbol: 'AR',
    iconUrl:
      'https://assets.coingecko.com/coins/images/4343/large/oRt6SiEN_400x400.jpg',
    coinGeckoId: 'arweave',
    category: 'other',
  },
  ALGO: {
    symbol: 'ALGO',
    iconUrl:
      'https://assets.coingecko.com/coins/images/4380/large/download.png',
    coinGeckoId: 'algorand',
    category: 'layer1',
  },
  IOTA: {
    symbol: 'IOTA',
    iconUrl:
      'https://assets.coingecko.com/coins/images/692/large/IOTA_Swirl.png',
    coinGeckoId: 'iota',
    category: 'layer1',
  },
  HBAR: {
    symbol: 'HBAR',
    iconUrl: 'https://assets.coingecko.com/coins/images/3688/large/hbar.png',
    coinGeckoId: 'hedera-hashgraph',
    category: 'layer1',
  },
  ETC: {
    symbol: 'ETC',
    iconUrl:
      'https://assets.coingecko.com/coins/images/453/large/ethereum-classic-logo.png',
    coinGeckoId: 'ethereum-classic',
    category: 'layer1',
  },
  BSV: {
    symbol: 'BSV',
    iconUrl: 'https://assets.coingecko.com/coins/images/6799/large/BSV.png',
    coinGeckoId: 'bitcoin-cash-sv',
    category: 'major',
  },
  XLM: {
    symbol: 'XLM',
    iconUrl:
      'https://assets.coingecko.com/coins/images/100/large/Stellar_symbol_black_RGB.png',
    coinGeckoId: 'stellar',
    category: 'layer1',
  },
  MINA: {
    symbol: 'MINA',
    iconUrl:
      'https://assets.coingecko.com/coins/images/15628/large/JM4_vQ34_400x400.png',
    coinGeckoId: 'mina-protocol',
    category: 'layer1',
  },
  ZEN: {
    symbol: 'ZEN',
    iconUrl: 'https://assets.coingecko.com/coins/images/691/large/horizen.png',
    coinGeckoId: 'horizen',
    category: 'layer1',
  },
  NEO: {
    symbol: 'NEO',
    iconUrl:
      'https://assets.coingecko.com/coins/images/480/large/NEO_512_512.png',
    coinGeckoId: 'neo',
    category: 'layer1',
  },
  KAS: {
    symbol: 'KAS',
    iconUrl:
      'https://assets.coingecko.com/coins/images/25751/large/kaspa-icon-exchanges.png',
    coinGeckoId: 'kaspa',
    category: 'layer1',
  },
  CELO: {
    symbol: 'CELO',
    iconUrl:
      'https://assets.coingecko.com/coins/images/11090/large/icon-celo-CELO-color-500.png',
    coinGeckoId: 'celo',
    category: 'layer1',
  },

  // DeFi/Exchange Tokens
  JUP: {
    symbol: 'JUP',
    iconUrl: 'https://assets.coingecko.com/coins/images/35220/large/jup.png',
    coinGeckoId: 'jupiter-exchange-solana',
    category: 'defi',
  },
  JTO: {
    symbol: 'JTO',
    iconUrl: 'https://assets.coingecko.com/coins/images/34341/large/jito.png',
    coinGeckoId: 'jito-governance-token',
    category: 'defi',
  },
  DYDX: {
    symbol: 'DYDX',
    iconUrl:
      'https://assets.coingecko.com/coins/images/17500/large/hjnIm9bV.jpg',
    coinGeckoId: 'dydx',
    category: 'defi',
  },
  GMX: {
    symbol: 'GMX',
    iconUrl: 'https://assets.coingecko.com/coins/images/18323/large/arbit.png',
    coinGeckoId: 'gmx',
    category: 'defi',
  },
  RSR: {
    symbol: 'RSR',
    iconUrl: 'https://assets.coingecko.com/coins/images/8365/large/reserve.jpg',
    coinGeckoId: 'reserve-rights-token',
    category: 'defi',
  },
  UMA: {
    symbol: 'UMA',
    iconUrl: 'https://assets.coingecko.com/coins/images/10951/large/UMA.png',
    coinGeckoId: 'uma',
    category: 'defi',
  },
  FXS: {
    symbol: 'FXS',
    iconUrl:
      'https://assets.coingecko.com/coins/images/13423/large/frax_share.png',
    coinGeckoId: 'frax-share',
    category: 'defi',
  },
  RUNE: {
    symbol: 'RUNE',
    iconUrl: 'https://assets.coingecko.com/coins/images/6595/large/RUNE.png',
    coinGeckoId: 'thorchain',
    category: 'defi',
  },
  CAKE: {
    symbol: 'CAKE',
    iconUrl:
      'https://assets.coingecko.com/coins/images/12632/large/pancakeswap-cake-logo_.png',
    coinGeckoId: 'pancakeswap-token',
    category: 'defi',
  },
  STG: {
    symbol: 'STG',
    iconUrl:
      'https://assets.coingecko.com/coins/images/24413/large/STG_LOGO.png',
    coinGeckoId: 'stargate-finance',
    category: 'defi',
  },
  ZRO: {
    symbol: 'ZRO',
    iconUrl:
      'https://assets.coingecko.com/coins/images/28206/large/ftxG9_TJ_400x400.jpeg',
    coinGeckoId: 'layerzero',
    category: 'defi',
  },

  // Specialized Project Tokens
  INIT: {
    symbol: 'INIT',
    iconUrl: 'https://assets.coingecko.com/coins/images/34678/large/init.png',
    coinGeckoId: 'initial-coin',
    category: 'other',
  },
  HYPER: {
    symbol: 'HYPER',
    iconUrl: 'https://assets.coingecko.com/coins/images/34702/large/hyper.png',
    coinGeckoId: 'hyper',
    category: 'other',
  },
  MNT: {
    symbol: 'MNT',
    iconUrl:
      'https://assets.coingecko.com/coins/images/30980/large/token-logo.png',
    coinGeckoId: 'mantle',
    category: 'layer2',
  },
  SYRUP: {
    symbol: 'SYRUP',
    iconUrl: 'https://assets.coingecko.com/coins/images/34801/large/syrup.png',
    coinGeckoId: 'syrup',
    category: 'other',
  },
  FTT: {
    symbol: 'FTT',
    iconUrl: 'https://assets.coingecko.com/coins/images/9026/large/F.png',
    coinGeckoId: 'ftx-token',
    category: 'other',
  },
  VINE: {
    symbol: 'VINE',
    iconUrl: 'https://assets.coingecko.com/coins/images/34856/large/vine.png',
    coinGeckoId: 'vine',
    category: 'other',
  },
  REZ: {
    symbol: 'REZ',
    iconUrl: 'https://assets.coingecko.com/coins/images/35508/large/rez.png',
    coinGeckoId: 'renzo',
    category: 'defi',
  },
  VVV: {
    symbol: 'VVV',
    iconUrl: 'https://assets.coingecko.com/coins/images/34902/large/vvv.png',
    coinGeckoId: 'vvv',
    category: 'other',
  },
  BERA: {
    symbol: 'BERA',
    iconUrl:
      'https://assets.coingecko.com/coins/images/34939/large/berachain.png',
    coinGeckoId: 'berachain-bera',
    category: 'layer1',
  },
  W: {
    symbol: 'W',
    iconUrl:
      'https://assets.coingecko.com/coins/images/35730/large/wormhole.png',
    coinGeckoId: 'wormhole',
    category: 'defi',
  },
  USUAL: {
    symbol: 'USUAL',
    iconUrl: 'https://assets.coingecko.com/coins/images/36715/large/usual.png',
    coinGeckoId: 'usual',
    category: 'defi',
  },
  DOOD: {
    symbol: 'DOOD',
    iconUrl: 'https://assets.coingecko.com/coins/images/34999/large/dood.png',
    coinGeckoId: 'dood',
    category: 'meme',
  },
  BIO: {
    symbol: 'BIO',
    iconUrl: 'https://assets.coingecko.com/coins/images/37191/large/bio.png',
    coinGeckoId: 'biopassport',
    category: 'other',
  },
  TST: {
    symbol: 'TST',
    iconUrl: 'https://assets.coingecko.com/coins/images/35104/large/tst.png',
    coinGeckoId: 'threshold-network-token',
    category: 'other',
  },
  SCR: {
    symbol: 'SCR',
    iconUrl: 'https://assets.coingecko.com/coins/images/35394/large/scr.png',
    coinGeckoId: 'scroll',
    category: 'layer2',
  },
  BANANA: {
    symbol: 'BANANA',
    iconUrl: 'https://assets.coingecko.com/coins/images/35263/large/banana.png',
    coinGeckoId: 'banana-gun',
    category: 'other',
  },
  TNSR: {
    symbol: 'TNSR',
    iconUrl: 'https://assets.coingecko.com/coins/images/35943/large/tensor.png',
    coinGeckoId: 'tensor',
    category: 'defi',
  },
  MELANIA: {
    symbol: 'MELANIA',
    iconUrl:
      'https://assets.coingecko.com/coins/images/37525/large/melania.png',
    coinGeckoId: 'melania',
    category: 'meme',
  },
  ME: {
    symbol: 'ME',
    iconUrl: 'https://assets.coingecko.com/coins/images/37079/large/me.png',
    coinGeckoId: 'magic-eden',
    category: 'defi',
  },
  LAUNCHCOIN: {
    symbol: 'LAUNCHCOIN',
    iconUrl:
      'https://assets.coingecko.com/coins/images/35208/large/launchcoin.png',
    coinGeckoId: 'launchcoin',
    category: 'other',
  },
  RESOLV: {
    symbol: 'RESOLV',
    iconUrl: 'https://assets.coingecko.com/coins/images/35409/large/resolv.png',
    coinGeckoId: 'resolv',
    category: 'other',
  },
  LAYER: {
    symbol: 'LAYER',
    iconUrl: 'https://assets.coingecko.com/coins/images/35504/large/layer.png',
    coinGeckoId: 'layer-bank',
    category: 'defi',
  },
  ZORA: {
    symbol: 'ZORA',
    iconUrl: 'https://assets.coingecko.com/coins/images/35751/large/zora.png',
    coinGeckoId: 'zora',
    category: 'other',
  },
  MOVE: {
    symbol: 'MOVE',
    iconUrl: 'https://assets.coingecko.com/coins/images/37076/large/move.png',
    coinGeckoId: 'movement',
    category: 'layer1',
  },
  IP: {
    symbol: 'IP',
    iconUrl: 'https://assets.coingecko.com/coins/images/35707/large/ip.png',
    coinGeckoId: 'intellectual-property',
    category: 'other',
  },
  NXPC: {
    symbol: 'NXPC',
    iconUrl: 'https://assets.coingecko.com/coins/images/35801/large/nxpc.png',
    coinGeckoId: 'nxpc',
    category: 'other',
  },
  OGN: {
    symbol: 'OGN',
    iconUrl: 'https://assets.coingecko.com/coins/images/3296/large/op.jpg',
    coinGeckoId: 'origin-protocol',
    category: 'defi',
  },
  TRUMP: {
    symbol: 'TRUMP',
    iconUrl: 'https://assets.coingecko.com/coins/images/37527/large/trump.png',
    coinGeckoId: 'maga',
    category: 'meme',
  },
  CFX: {
    symbol: 'CFX',
    iconUrl:
      'https://assets.coingecko.com/coins/images/13079/large/3vuYMbjN.png',
    coinGeckoId: 'conflux-token',
    category: 'layer1',
  },
  GRASS: {
    symbol: 'GRASS',
    iconUrl: 'https://assets.coingecko.com/coins/images/34404/large/grass.png',
    coinGeckoId: 'grass',
    category: 'other',
  },
  OM: {
    symbol: 'OM',
    iconUrl:
      'https://assets.coingecko.com/coins/images/12220/large/mantra-om.png',
    coinGeckoId: 'mantra-dao',
    category: 'defi',
  },
  PEOPLE: {
    symbol: 'PEOPLE',
    iconUrl: 'https://assets.coingecko.com/coins/images/16727/large/people.jpg',
    coinGeckoId: 'constitutiondao',
    category: 'other',
  },
  MAV: {
    symbol: 'MAV',
    iconUrl: 'https://assets.coingecko.com/coins/images/30745/large/mav.png',
    coinGeckoId: 'maverick-protocol',
    category: 'defi',
  },
  NIL: {
    symbol: 'NIL',
    iconUrl: 'https://assets.coingecko.com/coins/images/35905/large/nil.png',
    coinGeckoId: 'nil',
    category: 'other',
  },
  PROMPT: {
    symbol: 'PROMPT',
    iconUrl: 'https://assets.coingecko.com/coins/images/36001/large/prompt.png',
    coinGeckoId: 'prompt',
    category: 'other',
  },
  ACE: {
    symbol: 'ACE',
    iconUrl: 'https://assets.coingecko.com/coins/images/33413/large/ace.png',
    coinGeckoId: 'fusionist',
    category: 'gaming',
  },
  SOPH: {
    symbol: 'SOPH',
    iconUrl: 'https://assets.coingecko.com/coins/images/36108/large/soph.png',
    coinGeckoId: 'soph',
    category: 'other',
  },
  OMNI: {
    symbol: 'OMNI',
    iconUrl: 'https://assets.coingecko.com/coins/images/35925/large/omni.png',
    coinGeckoId: 'omni-network',
    category: 'layer2',
  },
  ZETA: {
    symbol: 'ZETA',
    iconUrl: 'https://assets.coingecko.com/coins/images/33617/large/zeta.png',
    coinGeckoId: 'zetachain',
    category: 'layer1',
  },
  XAI: {
    symbol: 'XAI',
    iconUrl: 'https://assets.coingecko.com/coins/images/33503/large/xai.png',
    coinGeckoId: 'xai-games',
    category: 'gaming',
  },
  MERL: {
    symbol: 'MERL',
    iconUrl: 'https://assets.coingecko.com/coins/images/36202/large/merl.png',
    coinGeckoId: 'merlin-chain',
    category: 'layer2',
  },
  ALT: {
    symbol: 'ALT',
    iconUrl: 'https://assets.coingecko.com/coins/images/34942/large/alt.png',
    coinGeckoId: 'altlayer',
    category: 'layer2',
  },
  PURR: {
    symbol: 'PURR',
    iconUrl: 'https://assets.coingecko.com/coins/images/34710/large/purr.png',
    coinGeckoId: 'purr',
    category: 'other',
  },
  SUPER: {
    symbol: 'SUPER',
    iconUrl:
      'https://assets.coingecko.com/coins/images/14040/large/6YPdWn6.png',
    coinGeckoId: 'superfarm',
    category: 'gaming',
  },
  KAITO: {
    symbol: 'KAITO',
    iconUrl: 'https://assets.coingecko.com/coins/images/36303/large/kaito.png',
    coinGeckoId: 'kaito',
    category: 'other',
  },
  IO: {
    symbol: 'IO',
    iconUrl: 'https://assets.coingecko.com/coins/images/35490/large/io.png',
    coinGeckoId: 'io',
    category: 'ai',
  },
  DYM: {
    symbol: 'DYM',
    iconUrl: 'https://assets.coingecko.com/coins/images/35052/large/dym.png',
    coinGeckoId: 'dymension',
    category: 'layer1',
  },
  SPX: {
    symbol: 'SPX',
    iconUrl: 'https://assets.coingecko.com/coins/images/36407/large/spx.png',
    coinGeckoId: 'spx6900',
    category: 'meme',
  },
  USTC: {
    symbol: 'USTC',
    iconUrl:
      'https://assets.coingecko.com/coins/images/8284/large/luna1557227471663.png',
    coinGeckoId: 'terrausd',
    category: 'stablecoin',
  },
  ORDI: {
    symbol: 'ORDI',
    iconUrl: 'https://assets.coingecko.com/coins/images/30162/large/ordi.png',
    coinGeckoId: 'ordi',
    category: 'other',
  },
  GMT: {
    symbol: 'GMT',
    iconUrl:
      'https://assets.coingecko.com/coins/images/18085/large/gmtoken.png',
    coinGeckoId: 'stepn',
    category: 'other',
  },
  SAGA: {
    symbol: 'SAGA',
    iconUrl: 'https://assets.coingecko.com/coins/images/35912/large/saga.png',
    coinGeckoId: 'saga',
    category: 'layer1',
  },
  GAS: {
    symbol: 'GAS',
    iconUrl: 'https://assets.coingecko.com/coins/images/4480/large/GAS.png',
    coinGeckoId: 'gas',
    category: 'other',
  },
  S: {
    symbol: 'S',
    iconUrl: 'https://assets.coingecko.com/coins/images/36501/large/s.png',
    coinGeckoId: 's',
    category: 'other',
  },
  WCT: {
    symbol: 'WCT',
    iconUrl: 'https://assets.coingecko.com/coins/images/36601/large/wct.png',
    coinGeckoId: 'wct',
    category: 'other',
  },
  ARK: {
    symbol: 'ARK',
    iconUrl: 'https://assets.coingecko.com/coins/images/484/large/ark.png',
    coinGeckoId: 'ark',
    category: 'layer1',
  },
  REQ: {
    symbol: 'REQ',
    iconUrl:
      'https://assets.coingecko.com/coins/images/1031/large/Request_icon_green.png',
    coinGeckoId: 'request-network',
    category: 'defi',
  },
  BIGTIME: {
    symbol: 'BIGTIME',
    iconUrl:
      'https://assets.coingecko.com/coins/images/32404/large/big-time.png',
    coinGeckoId: 'big-time',
    category: 'gaming',
  },
  POLYX: {
    symbol: 'POLYX',
    iconUrl: 'https://assets.coingecko.com/coins/images/17312/large/POLYX.png',
    coinGeckoId: 'polymesh',
    category: 'other',
  },
  MAVIA: {
    symbol: 'MAVIA',
    iconUrl: 'https://assets.coingecko.com/coins/images/35004/large/mavia.png',
    coinGeckoId: 'heroes-of-mavia',
    category: 'gaming',
  },
  GRIFFAIN: {
    symbol: 'GRIFFAIN',
    iconUrl:
      'https://assets.coingecko.com/coins/images/36701/large/griffain.png',
    coinGeckoId: 'griffain',
    category: 'other',
  },
};
