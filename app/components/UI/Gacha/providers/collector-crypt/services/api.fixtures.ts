/* eslint-disable @metamask/design-tokens/color-no-hex -- Card numbers such as #065 are NFT metadata, not colors. */
/**
 * Real payloads captured on 2026-09-29 from the CollectorCrypt and MetaMask
 * NFT APIs (mainnet, read-only endpoints). Used as test fixtures.
 */

/** GET /api/machines, public open machine. */
export const machinePokemon50 = {
  code: 'pokemon_50',
  name: 'Elite Pokémon Gacha Pack',
  shortName: 'PKMN 50',
  mobile_name: 'ELITE',
  image: '',
  thumbnailUrl: '/pokemon_50.png',
  videoSrc:
    'https://degwuxynwtb2zaso.public.blob.vercel-storage.com/machines/pokemon_50/video-79QRYsZ79eFUafMuqw9Soxgv6ge6t0.webm',
  videoHevc:
    'https://degwuxynwtb2zaso.public.blob.vercel-storage.com/machines/pokemon_50/hevc-mBjNSKFsjSbUF3Yk3dW5MpmxnhsWOq.mp4',
  videoNobgWeb:
    'https://degwuxynwtb2zaso.public.blob.vercel-storage.com/machines/pokemon_50/videoNobgWeb-qP0gMmmjOcKDjVJ40ggoAlFPPU5Gks.webm',
  videoNobgIos:
    'https://degwuxynwtb2zaso.public.blob.vercel-storage.com/machines/pokemon_50/videoNobgIos-8Dom2XfCl00l8vxs8m87poRcqh5vbA.mp4',
  videoNobgAndroid:
    'https://degwuxynwtb2zaso.public.blob.vercel-storage.com/machines/pokemon_50/videoNobgAndroid-2lUDieOs6X8fkYO6QOoytpOhjYaoig.mp4',
  imageNobg:
    'https://degwuxynwtb2zaso.public.blob.vercel-storage.com/machines/pokemon_50/imageNobg-XvuRTLlLQdHWJc8wG7EIYmOITBIjQC.png',
  public: true,
  owner: null,
  isPartner: false,
  adoptable: false,
  parentCode: null,
  menuOrder: 4,
  menuCategory: 'Pokemon',
  price: 50,
  contains: 1,
  instantBuyback: 85,
  freeSpins: true,
  turboMode: true,
  fixedEv: false,
  pointsMultiplier: 1,
  lowThreshold: 50,
  odds: {
    common: 0.8,
    uncommon: 0.15,
    rare: 0.04,
    epic: 0.01,
  },
  tierRanges: {
    common: {
      start: 30,
      end: 60,
    },
    uncommon: {
      start: 60,
      end: 110,
    },
    rare: {
      start: 110,
      end: 250,
    },
    epic: {
      start: 250,
      end: 5001,
    },
  },
  stock: {
    common: 331,
    uncommon: 244,
    rare: 310,
    epic: 199,
  },
  ev: 54.74950370907305,
};

/** GET /api/machines, public but closed in /status. */
export const machineSealed80 = {
  code: 'sealed_80',
  name: 'Sealed Gacha Pack',
  shortName: 'SEALED 80',
  mobile_name: null,
  image: '',
  thumbnailUrl: '/sealed_80.png',
  videoSrc: '/sealed_80.webm',
  videoHevc: '/sealed_80.hevc.mp4',
  videoNobgWeb:
    'https://degwuxynwtb2zaso.public.blob.vercel-storage.com/machines/sealed_80/videoNobgWeb-UjKZbsAm0glxIBtu9aTK7Un1zwVu7c.webm',
  videoNobgIos:
    'https://degwuxynwtb2zaso.public.blob.vercel-storage.com/machines/sealed_80/videoNobgIos-gUNrkuUwobR9pCBscIn7GI6WTGfCuM.mp4',
  videoNobgAndroid:
    'https://degwuxynwtb2zaso.public.blob.vercel-storage.com/machines/sealed_80/videoNobgAndroid-nbIzJ4rqbi5IWlEhHEw5JTbsfS4Ypv.mp4',
  imageNobg:
    'https://degwuxynwtb2zaso.public.blob.vercel-storage.com/machines/sealed_80/imageNobg-0mxGfbwxgREZHyv9NlAAXJhakS4Vnt.png',
  public: true,
  owner: null,
  isPartner: false,
  adoptable: false,
  parentCode: null,
  menuOrder: 12,
  menuCategory: 'Pokemon',
  price: 80,
  contains: 1,
  instantBuyback: 90,
  freeSpins: false,
  turboMode: true,
  fixedEv: false,
  pointsMultiplier: 1.6,
  lowThreshold: 50,
  odds: {
    common: 0.8,
    uncommon: 0.15,
    rare: 0.04,
    epic: 0.01,
  },
  tierRanges: {
    common: {
      start: 40,
      end: 80,
    },
    uncommon: {
      start: 80,
      end: 160,
    },
    rare: {
      start: 160,
      end: 400,
    },
    epic: {
      start: 400,
      end: 5001,
    },
  },
  stock: {
    common: 297,
    uncommon: 231,
    rare: 196,
    epic: 155,
  },
  ev: 83.27528046317909,
};

/** GET /api/machines, private machine (returned without API key). */
export const machinePrivate = {
  code: 'pokemon_151',
  name: '151 & Friends',
  shortName: 'PKMN 151',
  mobile_name: null,
  image: '',
  thumbnailUrl: '/pokemon_151.png',
  videoSrc: '/pokemon_151.webm',
  videoHevc: '/pokemon_151.hevc.mp4',
  videoNobgWeb: null,
  videoNobgIos: null,
  videoNobgAndroid: null,
  imageNobg: null,
  public: false,
  owner: null,
  isPartner: false,
  adoptable: false,
  parentCode: null,
  menuOrder: 10,
  menuCategory: 'Pokemon',
  price: 151,
  contains: 1,
  instantBuyback: 90,
  freeSpins: false,
  turboMode: true,
  fixedEv: false,
  pointsMultiplier: 3.02,
  lowThreshold: 50,
  odds: {
    common: 0.75,
    uncommon: 0.2,
    rare: 0.04,
    epic: 0.01,
  },
  tierRanges: {
    common: {
      start: 75,
      end: 150,
    },
    uncommon: {
      start: 150,
      end: 300,
    },
    rare: {
      start: 300,
      end: 750,
    },
    epic: {
      start: 750,
      end: 15001,
    },
  },
  stock: {
    common: 58,
    uncommon: 15,
    rare: 150,
    epic: 147,
  },
  ev: 156.46436293689888,
};

/** GET /api/status (subset of `gachas`). */
export const status = {
  machineStatus: 'running',
  legendaryStatus: 'open',
  eliteStatus: 'open',
  freePacksStatus: 'open',
  sportsStatus: 'open',
  gachas: [
    {
      code: 'pokemon_50',
      name: 'Elite Pokémon Gacha Pack',
      price: 50,
      status: 'open',
      isOpen: true,
    },
    {
      code: 'pokemon_151',
      name: '151 & Friends',
      price: 151,
      status: 'open',
      isOpen: true,
    },
    {
      code: 'sealed_80',
      name: 'Sealed Gacha Pack',
      price: 80,
      status: 'closed',
      isOpen: false,
    },
    {
      code: 'eprimate_100',
      name: 'Primate 100',
      price: 100,
      status: 'closed',
      isOpen: null,
    },
  ],
};

/** Card object as returned by openPack `nftWon` (from getRecentWinners). */
export const nftWon = {
  id: '5LTsPPRXqUWNA9nx8zy8NchSWrmqAdzF28m5wPzZ1kE6',
  content: {
    files: [
      {
        uri: 'https://nft.collectorcrypt.com/front/2026092456C266582',
        mime: 'image/jpeg',
        cc_cdn:
          'https://d1xpxki1g4htqu.cloudfront.net/HOuz-njw_vheULIxww-8wIpn4xQ8ePJ17knG15JY3tw',
        cdn_uri:
          'https://cdn.helius-rpc.com/cdn-cgi/image//https://nft.collectorcrypt.com/front/2026092456C266582',
      },
      {
        uri: 'https://nft.collectorcrypt.com/back/2026092456C266582',
        mime: 'image/jpeg',
        cc_cdn:
          'https://d1xpxki1g4htqu.cloudfront.net/04WHfXXo-2Lgi0TEYdqIUoHF4Mvhh_v2M6Bn9LoC2cM',
        cdn_uri:
          'https://cdn.helius-rpc.com/cdn-cgi/image//https://nft.collectorcrypt.com/back/2026092456C266582',
      },
    ],
    links: {
      image: 'https://nft.collectorcrypt.com/front/2026092456C266582',
    },
    json_uri: 'https://arweave.net/5Wjk-2J99n3Jmk19nXnGQOvKLjC2NPW7IgaGz1Q65lo',
    metadata: {
      name: '2025 #065 Ivysaur PSA 10 Japanes',
      symbol: '',
      json_name: '2025 #065 Ivysaur PSA 10 Japanese M1l-Mega Brave',
      attributes: [
        {
          value: '2026092456C266582',
          trait_type: 'Collector Crypt ID',
        },
        {
          value: '065',
          trait_type: 'Serial Number',
        },
        {
          value: 'Card',
          trait_type: 'Type',
        },
        {
          value: 'Pokemon',
          trait_type: 'Category',
        },
        {
          value: 'Valid',
          trait_type: 'Status',
        },
        {
          value: '2025',
          trait_type: 'Year',
        },
        {
          value: '37',
          trait_type: 'Insured Value',
        },
        {
          value: 'OmniVault',
          trait_type: 'Vault',
        },
        {
          value: '',
          trait_type: 'Location',
        },
        {
          value: 'X3X59ZSW',
          trait_type: 'Vault ID',
        },
        {
          value: '145822162',
          trait_type: 'Grading ID',
        },
        {
          value: 'PSA',
          trait_type: 'Grading Company',
        },
        {
          value: 'false',
          trait_type: 'Autographed',
        },
        {
          value: 'GEM-MT 10',
          trait_type: 'The Grade',
        },
        {
          value: 'true',
          trait_type: 'Authenticated',
        },
        {
          value: 'Pokemon Japanese M1l-Mega Brave',
          trait_type: 'Set',
        },
        {
          value: 'fd9758244e5c2dcfdb882fb664e7190ea5e41b62',
          trait_type: 'Gemrate Id',
        },
        {
          value: 'fd9758244e5c2dcfdb882fb664e7190ea5e41b62',
          trait_type: 'Gemrate Universal Id',
        },
        {
          value: 'g10',
          trait_type: 'Gemrate Grade',
        },
        {
          value: 'Ivysaur',
          trait_type: 'Card Name',
        },
        {
          value: '2025 Pokemon Japanese M1l-Mega Brave Ivysaur Art Rare 065',
          trait_type: 'Description',
        },
        {
          value: '14158166',
          trait_type: 'Spec Id',
        },
        {
          value:
            'https://www.psacard.com/pop/tcg-cards/2025/pokemon-japanese-m1l-mega-brave/312124',
          trait_type: 'Set Url',
        },
        {
          value: 'Art Rare',
          trait_type: 'Parallel',
        },
      ],
      description: '2025 #065 Ivysaur PSA 10 Japanese M1l-Mega Brave',
      insuredValue: '37',
    },
  },
  ownership: {
    owner: 'Low6UekJP3QrFVMfNRTL8CPK2SiGFhvp57sgF2pkmVu',
  },
  nft_standard: 'core',
  image:
    'https://d1xpxki1g4htqu.cloudfront.net/HOuz-njw_vheULIxww-8wIpn4xQ8ePJ17knG15JY3tw',
};

/** GET /api/pack/status?memo= for a delivered and bought back pack. */
export const packStatus = {
  memo: 'slabz-cc791172-bc58-4949-ae85-4b0d5e3a25e6',
  pack: {
    wallet: '2euLumARMfXPW4REBXoYrLdLoWqTmXaHUNXD4ZJiPpAe',
    transaction_signature:
      '4TjEWyeQXPfZyzqDudg2eEo6ooD83NM6jiqBu4YuG3BuGNdfYRW1Br5QRdY4Y1x66jzHQDrL87knXqHW7Geb6rv',
    created_at: '2026-09-29T11:01:46.091Z',
    status: 'confirmed',
    webhook_received: true,
    refunded: null,
    refund_transaction_signature: null,
    turbo_mode: false,
    pack_type: 'onepiece_250',
    token_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  },
  send: {
    from_wallet: 'onePMfirJs2Rx3eixoPnjY6NHiaC74pkQ2k313K2Lxs',
    to_wallet: '2euLumARMfXPW4REBXoYrLdLoWqTmXaHUNXD4ZJiPpAe',
    nft_address: '2epARjc84XVnkTcWgaXSxF4w6ZDT7Usj5aRnsmaQmRG1',
    transaction_signature:
      '3YDp2eGsd1wp3AQMm5axKG2YbPekvMrGEwvaMqV8mMz4RNSG13ih5fKzzj2PyzBWug2P6jcocBoCiuG3uEnYQFEu',
    created_at: '2026-09-29T11:01:47.305Z',
    status: 'confirmed',
    webhook_sent: true,
    points: 0,
    insured_value: 180,
    prize_tier: 4,
    vrf_proof:
      '0x6bfbfaf433eda8c6824f42f069221c4c2523020b54568e6e25f9523228f52d6cf13dcf2fc3528fd5edaeb95d6bd5cec3eeec11c04712d9cecba0b12f2128388acf99315063fbb405e8bf257aab18fc03',
  },
  buyback: [
    {
      user_wallet: '2euLumARMfXPW4REBXoYrLdLoWqTmXaHUNXD4ZJiPpAe',
      refund_amount: '162000000',
      created_at: '2026-09-29T11:02:00.716Z',
      webhook_confirmed: true,
      transaction_signature:
        '5c3JDYakj1EEwM1hMGcSYQWWSNNVHGcH7vDL5tHzxQz4ngDZydhuFhnyp8QQjxGX3kQdTbzrvKhCHVoYko6Ww88V',
      status: 'confirmed',
      alt_recipient: null,
    },
  ],
};

/** GET /api/pack/status?memo= for an unknown memo. */
export const packStatusUnknown = {
  memo: 'cc-00000000-0000-0000-0000-000000000000',
  pack: null,
  send: null,
  buyback: [],
};

/** GET /api/buyback/available?nft= */
export const buybackAvailable = {
  available: true,
  amount: 42500000,
};

/** GET /api/buyback/check?memo= after a completed buyback. */
export const buybackCheck = {
  exists: true,
  playerWallet: '2euLumARMfXPW4REBXoYrLdLoWqTmXaHUNXD4ZJiPpAe',
  nft: '2epARjc84XVnkTcWgaXSxF4w6ZDT7Usj5aRnsmaQmRG1',
  transactionSignature:
    '5c3JDYakj1EEwM1hMGcSYQWWSNNVHGcH7vDL5tHzxQz4ngDZydhuFhnyp8QQjxGX3kQdTbzrvKhCHVoYko6Ww88V',
  buybackAmount: '162000000',
  createdAt: '2026-09-29T11:02:00.716Z',
  status: 'complete',
};

/** GET /api/buyback/check?memo= for an unknown memo. */
export const buybackCheckUnknown = {
  exists: false,
  message: 'No buyback transaction found for this memo',
};

/** GET https://api.collectorcrypt.com/cards/{wallet}/ (fields trimmed). */
export const walletCards = {
  totalCards: 3,
  total: 3,
  findTotal: 3,
  totalPages: 2,
  insuredValueSum: '1445',
  cardsQtyByCategory: {
    'One Piece': 3,
  },
  totalCardsCoast: '1445',
  filterNFtCard: [
    {
      id: '2026072415C213709',
      nftAddress: '9iQWVTEBXJmw7N5ZoPE1njuijtfAcXsDhUzwDY88ZBoh',
      itemName:
        '2024 #017 Nico Robin PSA 10 One Piece English Version 1st Anniversary Set',
      blockchain: 'Solana',
      nftStandard: 'core',
      status: 'Transferred',
      nftStatus: 'Valid',
      insuredValue: '800',
      grade: 'GEM-MT 10',
      gradeNum: null,
      gradingCompany: 'PSA',
      category: 'One Piece',
      year: 2024,
      set: 'One Piece English Version 1st Anniversary Set',
      serial: '017',
      parallel: 'Base',
      frontImage:
        'https://d1xpxki1g4htqu.cloudfront.net/p9EfI-KIltpVmeGEHm1Agpu0HLPg9cDzIRaBMHUzmCY',
      backImage:
        'https://d1xpxki1g4htqu.cloudfront.net/qKWRqIDl0K2liUBxeMvJl8L8fmvmmnDFJnG-MQZb8Xg',
      images: {
        back: 'https://d1xpxki1g4htqu.cloudfront.net/7crStm-tkSNdWYPZHB0fW_Fdr25vqn-5km8qyoxYuxQ',
        backM:
          'https://d1xpxki1g4htqu.cloudfront.net/sX2T0_DeLpAQTaB41udpZE5tJgIWCPwWCFsrscL37D4',
        backS:
          'https://d1xpxki1g4htqu.cloudfront.net/sn242i9tRCzB4bKyFFio0Ek_Ur4A8oaacfvUxbwwPI8',
        cardId: '2026072415C213709',
        front:
          'https://d1xpxki1g4htqu.cloudfront.net/_PqrU4uzzxpY2YhnbHifPCQWB7krD_hRbuNuewO6Wss',
        frontM:
          'https://d1xpxki1g4htqu.cloudfront.net/lruoKwaingKvt8XPByiUE-E9ZMWu_a4kIdoHCAZWAy8',
        frontS:
          'https://d1xpxki1g4htqu.cloudfront.net/Ekrb0l1DAwToNC6ykwDB6pSAkqYekUcmrmLBqKTLTNs',
        id: '5af0e621-5a23-4623-9f02-0e7ed35165f7',
      },
      getBuybackOffer: false,
      lastTransferredAt: '2026-09-26T15:32:44.010Z',
      owner: {
        id: 'cmpboe2gk56qruq4r6n31gtyw',
        wallet: '66cvcbcryJMFmYPKwdGhUnJn9hZTxPoLMEb378PEqRFR',
        name: 'marcyyyy',
        photo: null,
        bio: '',
        personalSite: '',
        twitterUsername: '',
        createdAt: '2026-05-18T20:47:43.604Z',
      },
      listing: null,
      inSwap: false,
      createdAt: '2026-07-24T07:08:15.851Z',
      vault: 'OmniVault',
    },
  ],
};

/** MetaMask NFT API item, Metaplex Core card. */
export const nftApiCoreItem = {
  chain: 'solana',
  address: '66cvcbcryJMFmYPKwdGhUnJn9hZTxPoLMEb378PEqRFR',
  token_address: '8D1muMqbwezWXUjKcQ3YYBUKXngoyA866AuJdy9xUVZu',
  token_id: null,
  balance: 1,
  acquired_at: null,
  nft_token: {
    address: '8D1muMqbwezWXUjKcQ3YYBUKXngoyA866AuJdy9xUVZu',
    token_id: null,
    token_standard: 'UNKNOWN',
    name: '2025 #051 Boa Hancock PSA 10 One Piece Seven Warlords of the Sea Binder Set',
    description:
      '2025 #051 Boa Hancock PSA 10 One Piece Seven Warlords of the Sea Binder Set',
    metadata: null,
    image_url: 'https://nft.collectorcrypt.com/front/2026091438C254874',
    media_url: null,
    external_url:
      'https://collectorcrypt.com/assets/solana/8D1muMqbwezWXUjKcQ3YYBUKXngoyA866AuJdy9xUVZu',
    attributes: [
      {
        key: 'Collector Crypt ID',
        value: '2026091438C254874',
      },
      {
        key: 'Serial Number',
        value: '051',
      },
      {
        key: 'Type',
        value: 'Card',
      },
      {
        key: 'Category',
        value: 'One Piece',
      },
      {
        key: 'Status',
        value: 'Valid',
      },
      {
        key: 'Year',
        value: '2025',
      },
      {
        key: 'Insured Value',
        value: '230',
      },
      {
        key: 'Vault',
        value: 'OmniVault',
      },
      {
        key: 'Location',
        value: '',
      },
      {
        key: 'Vault ID',
        value: 'ADMMGU4J',
      },
      {
        key: 'Grading ID',
        value: '140691487',
      },
      {
        key: 'Grading Company',
        value: 'PSA',
      },
      {
        key: 'Autographed',
        value: 'false',
      },
      {
        key: 'The Grade',
        value: 'GEM-MT 10',
      },
      {
        key: 'Authenticated',
        value: 'true',
      },
      {
        key: 'Set',
        value: 'One Piece Seven Warlords of the Sea Binder Set',
      },
      {
        key: 'Gemrate Id',
        value: 'b48c1e53c2c1d1b49565872b9f0010a2f23c606a',
      },
      {
        key: 'Gemrate Universal Id',
        value: 'b48c1e53c2c1d1b49565872b9f0010a2f23c606a',
      },
      {
        key: 'Gemrate Grade',
        value: 'g10',
      },
      {
        key: 'Card Name',
        value: 'Boa Hancock',
      },
      {
        key: 'Description',
        value:
          '2025 One Piece Seven Warlords of the Sea Binder Set Boa Hancock 051',
      },
      {
        key: 'Spec Id',
        value: '14695597',
      },
      {
        key: 'Set Url',
        value:
          'https://www.psacard.com/pop/tcg-cards/2025/one-piece-seven-warlords-of-the-sea-binder-set/320110',
      },
      {
        key: 'Parallel',
        value: 'Base',
      },
    ],
    token_account_address: null,
    creators: [
      {
        address: '8373hLiAEXxaJ3oV7SRzx4KHwurEg9rEG98tUPj1sdtX',
        share: 100,
        verified: 0,
      },
    ],
    collection_name: 'Collector Crypt',
    collection_symbol: 'collector_crypt_',
    collection_count: 86539,
    collection_image_url: null,
    onchain_collection_address: 'CCryptUfeFSZ3Fgc9FLeKrhLVAP67FSqi1GuVoj9CRac',
    floor_price: null,
    last_sale_price: {
      asset: {
        type: 'native',
        name: 'Wrapped SOL',
        symbol: 'SOL',
        decimals: 9,
        token_id: 'So11111111111111111111111111111111111111112',
      },
      amount: {
        raw_amount: '3346800',
        amount: 0.0033468,
      },
    },
    highest_bid_price: null,
    rarity: null,
  },
  isSpam: true,
};

/** MetaMask NFT API item, pNFT card (owner is the Gacha wallet). */
export const nftApiPnftItem = {
  chain: 'solana',
  address: 'GachaNgyXTU3zFogQ8Z5jR2BLXs8215X2AtEH18VxJq3',
  token_address: '5y9GsvBdAYrTHBwybZRJQVEkEVfcyr3v9WqzRktJxdue',
  token_id: null,
  balance: 1,
  acquired_at: null,
  nft_token: {
    address: '5y9GsvBdAYrTHBwybZRJQVEkEVfcyr3v9WqzRktJxdue',
    token_id: null,
    token_standard: 'PROGRAMMABLE_NFT',
    name: '2025 #005 Silvers Rayleigh PSA 10 OP11-A Fist of Divine Speed One Piece',
    description:
      '2025 #005 Silvers Rayleigh PSA 10 OP11-A Fist of Divine Speed One Piece',
    metadata: null,
    image_url:
      'https://arweave.net/goKHToXJqQy2Sb7wQC_92G_ynSpl3liCswjgp0DCvEY',
    media_url: null,
    external_url:
      'https://collectorcrypt.com/assets/solana/5y9GsvBdAYrTHBwybZRJQVEkEVfcyr3v9WqzRktJxdue',
    attributes: [
      {
        key: 'Collector Crypt ID',
        value: '2026020554C102673',
      },
      {
        key: 'Serial Number',
        value: '005',
      },
      {
        key: 'Type',
        value: 'Card',
      },
      {
        key: 'Category',
        value: 'One Piece',
      },
      {
        key: 'Status',
        value: 'Valid',
      },
      {
        key: 'Year',
        value: '2025',
      },
      {
        key: 'Insured Value',
        value: '130',
      },
      {
        key: 'Vault',
        value: 'OmniVault',
      },
      {
        key: 'Location',
        value: '',
      },
      {
        key: 'Vault ID',
        value: 'VCKE5R7U17',
      },
      {
        key: 'Grading ID',
        value: '140024105',
      },
      {
        key: 'Grading Company',
        value: 'PSA',
      },
      {
        key: 'Autographed',
        value: 'false',
      },
      {
        key: 'The Grade',
        value: 'GEM-MT 10',
      },
      {
        key: 'Authenticated',
        value: 'true',
      },
      {
        key: 'GradeNum',
        value: '10',
      },
      {
        key: 'Set',
        value: 'One Piece OP11-A Fist of Divine Speed',
      },
      {
        key: 'Gemrate Id',
        value: '7c62183a09e8c979f7a4e2616965df3f08b7e5d2',
      },
      {
        key: 'Gemrate Grade',
        value: 'g10',
      },
      {
        key: 'Card Name',
        value: 'Silvers Rayleigh',
      },
      {
        key: 'Description',
        value:
          '2025 One Piece OP11-A Fist of Divine Speed Silvers Rayleigh Special Alternate Art 005',
      },
      {
        key: 'Spec Id',
        value: '13619655',
      },
      {
        key: 'Set Url',
        value:
          'https://www.psacard.com/pop/tcg-cards/2025/one-piece-op11-a-fist-of-divine-speed/304942',
      },
      {
        key: 'Parallel',
        value: 'Special Alternate Art',
      },
    ],
    token_account_address: 'b3HVNg2W96P6LjGzTpDVWd4Kdhv6tmy1Q43QX4SYsSh',
    creators: [
      {
        address: 'DQPERZ9e86pNJ4mhUnCEP8V75yxZofsipoVrRWT5Wdxd',
        share: 100,
        verified: 0,
      },
    ],
    collection_name: 'Collector Crypt',
    collection_symbol: 'collector_crypt',
    collection_count: 60528,
    collection_image_url: null,
    onchain_collection_address: 'CCryptWBYktukHDQ2vHGtVcmtjXxYzvw8XNVY64YN2Yf',
    floor_price: null,
    last_sale_price: {
      asset: {
        type: 'native',
        name: 'Wrapped SOL',
        symbol: 'SOL',
        decimals: 9,
        token_id: 'So11111111111111111111111111111111111111112',
      },
      amount: {
        raw_amount: '21174240',
        amount: 0.02117424,
      },
    },
    highest_bid_price: null,
    rarity: null,
  },
  isSpam: true,
};

/** POST /api/openPack first open (documented shape, real `nftWon`). */
export const openPackAwarded = {
  success: true,
  transactionSignature:
    '3YDp2eGsd1wp3AQMm5axKG2YbPekvMrGEwvaMqV8mMz4RNSG13ih5fKzzj2PyzBWug2P6jcocBoCiuG3uEnYQFEu',
  nft_address: nftWon.id,
  nftWon,
  points: 0,
  rarity: 'Common',
  roll: 0.4213,
  buybackAmount: 42500000,
};

/** POST /api/openPack while the payment webhook is pending. */
export const openPackPending = {
  success: true,
  code: 'WAITING_FOR_WEBHOOK',
  memo: 'cc-7582548c-cf8c-42cb-b18f-1a8d76749c8a',
};
