/**
 * Mock response data for Polymarket CLOB order book API
 * Endpoint: /book?token_id=<token_id>
 */

// Base order book structure
const BASE_ORDER_BOOK = {
  timestamp: '1761177638154',
  hash: '97f541df6e9baa53e3583f8ebe69d06e86a2198c',
  bids: [
    { price: '0.01', size: '21342' },
    { price: '0.02', size: '155' },
    { price: '0.03', size: '852' },
    { price: '0.04', size: '150' },
    { price: '0.05', size: '200' },
    { price: '0.06', size: '1483' },
    { price: '0.1', size: '20' },
    { price: '0.14', size: '3000' },
    { price: '0.19', size: '20' },
    { price: '0.25', size: '40' },
    { price: '0.27', size: '16509' },
    { price: '0.28', size: '2025' },
    { price: '0.29', size: '3500' },
    { price: '0.3', size: '8583.33' },
    { price: '0.31', size: '36350' },
    { price: '0.32', size: '29258.57' },
    { price: '0.33', size: '2200' },
    { price: '0.34', size: '200' },
  ],
  asks: [
    { price: '0.99', size: '21517' },
    { price: '0.98', size: '160' },
    { price: '0.97', size: '923' },
    { price: '0.96', size: '150' },
    { price: '0.95', size: '287' },
    { price: '0.94', size: '150' },
    { price: '0.93', size: '150' },
    { price: '0.92', size: '2250' },
    { price: '0.9', size: '20' },
    { price: '0.68', size: '15' },
    { price: '0.45', size: '153' },
    { price: '0.43', size: '15192' },
    { price: '0.41', size: '250' },
    { price: '0.4', size: '2808' },
    { price: '0.39', size: '27651' },
    { price: '0.38', size: '3219.45' },
    { price: '0.37', size: '200' },
    { price: '0.36', size: '7793.72' },
    { price: '0.35', size: '638.42' },
  ],
  min_order_size: '5',
  tick_size: '0.01',
  neg_risk: false,
};

// 76ers vs Celtics order book (default)
export const POLYMARKET_ORDER_BOOK_RESPONSE = {
  ...BASE_ORDER_BOOK,
  market: '0xc327d77934fbb448fb89523640d0d1245c3df45b478ba9a9fd2c3d475760604d',
  asset_id:
    '36588252805891405622192021663682911922795750993518578680902576500086169492917',
};

// Zohran Mamdani order book
export const POLYMARKET_ZOHRAN_ORDER_BOOK_RESPONSE = {
  ...BASE_ORDER_BOOK,
  market: '0xebddfcf7b4401dade8b4031770a1ab942b01854f3bed453d5df9425cd9f211a9',
  asset_id:
    '33945469250963963541781051637999677727672635213493648594066577298999471399137',
};

// Chiefs Super Bowl order book
export const POLYMARKET_CHIEFS_ORDER_BOOK_RESPONSE = {
  ...BASE_ORDER_BOOK,
  market: '0x1d395b8dea9dd429fbce85f8b8cbd5aa85ec8a2e8980755756be3eec03da5b9a',
  asset_id:
    '11584273833068499329017832956188664326032555278943683999231427554688326830185',
};

// Andrew Cuomo order book
export const POLYMARKET_CUOMO_ORDER_BOOK_RESPONSE = {
  ...BASE_ORDER_BOOK,
  market: '0xc40cbb2d7f5d2c43c624bd5b1d0b18cd3d0682b3937363ec7c1ad1d13bee107e',
  asset_id:
    '72685162394098505217895638060393901041260225434938300730127268362092284806692',
};

// Bills Super Bowl order book
export const POLYMARKET_BILLS_ORDER_BOOK_RESPONSE = {
  ...BASE_ORDER_BOOK,
  market: '0x39d45b454dcf932767962ad9cbd858c5a6ec21d4d48318a484775b2e83264467',
  asset_id:
    '19740329944962592380580142050369523795065853055987745520766432334608119837023',
};

// Spurs vs Pelicans order book (Spurs token)
export const POLYMARKET_SPURS_ORDER_BOOK_RESPONSE = {
  market: '0x12899fadc50f47afa5f8e145380a9c6f0262d75ea12749bbbcb4f8b50f96cf6b',
  asset_id:
    '110743925263777693447488608878982152642205002490046349037358337248548507433643',
  timestamp: '1761342851801',
  hash: 'eaf8b0fcb0314225424e77c7949372dd925c3690',
  bids: [
    { price: '0.01', size: '15' },
    { price: '0.1', size: '10' },
    { price: '0.31', size: '2204' },
    { price: '0.35', size: '10' },
    { price: '0.4', size: '10' },
    { price: '0.41', size: '2062' },
    { price: '0.5', size: '46465.5' },
    { price: '0.51', size: '1996' },
    { price: '0.55', size: '5380' },
    { price: '0.56', size: '15688.02' },
    { price: '0.57', size: '34863' },
    { price: '0.58', size: '25764.03' },
    { price: '0.59', size: '23925.96' },
    { price: '0.6', size: '81506.92' },
    { price: '0.61', size: '454511.68' },
  ],
  asks: [
    { price: '0.9', size: '42.78' },
    { price: '0.89', size: '3408' },
    { price: '0.79', size: '2510' },
    { price: '0.74', size: '60413' },
    { price: '0.7', size: '5000' },
    { price: '0.69', size: '2224' },
    { price: '0.68', size: '16738.99' },
    { price: '0.67', size: '38648' },
    { price: '0.66', size: '24080.22' },
    { price: '0.65', size: '8920.67' },
    { price: '0.64', size: '132796.78' },
    { price: '0.63', size: '76194.39' },
    { price: '0.62', size: '46579.05' },
  ],
  min_order_size: '5',
  tick_size: '0.01',
  neg_risk: false,
};

// Spurs vs Pelicans order book (Pelicans token)
export const POLYMARKET_PELICANS_ORDER_BOOK_RESPONSE = {
  ...BASE_ORDER_BOOK,
  market: '0x12899fadc50f47afa5f8e145380a9c6f0262d75ea12749bbbcb4f8b50f96cf6b',
  asset_id:
    '38489710206351002266036612280230748165102516187175290608628298208123746725814',
  bids: [
    { price: '0.38', size: '1000' },
    { price: '0.37', size: '2000' },
    { price: '0.36', size: '1500' },
    { price: '0.35', size: '3000' },
    { price: '0.34', size: '2500' },
  ],
  asks: [
    { price: '0.39', size: '1000' },
    { price: '0.40', size: '2000' },
    { price: '0.41', size: '1500' },
    { price: '0.42', size: '3000' },
    { price: '0.43', size: '2500' },
  ],
};

// Celtics vs Nets order book (Celtics token)
// Market condition ID: 0x81daa857b8fa34cd3627c8cdbe5d92ea98756bcbe1e5cfcfffb94754e4d5ed86
// All asks at 0.84 to ensure consistent price regardless of order size
export const POLYMARKET_CELTICS_ORDER_BOOK_RESPONSE = {
  market: '0x81daa857b8fa34cd3627c8cdbe5d92ea98756bcbe1e5cfcfffb94754e4d5ed86',
  asset_id:
    '51851880223290407825872150827934296608070009371891114025629582819868766043137',
  timestamp: '1761177638154',
  hash: '97f541df6e9baa53e3583f8ebe69d06e86a2198c',
  bids: [
    { price: '0.83', size: '10000' }, // Best bid for selling
    { price: '0.82', size: '5000' },
    { price: '0.81', size: '3000' },
    { price: '0.80', size: '2000' },
  ],
  asks: [
    { price: '0.84', size: '1000000' }, // Single price level with massive liquidity - enough for any reasonable order size
    // No higher-priced asks to prevent price increases for larger orders
  ],
  min_order_size: '5',
  tick_size: '0.01',
  neg_risk: false,
};
