///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
/* eslint-disable arrow-body-style */
import { MULTICHAIN_ACCOUNT_TYPE_TO_MAINNET } from '../../core/Multichain/constants';
import { RootState } from '../../reducers';
import {
  selectChainId,
  selectEvmChainId,
  selectProviderConfig as selectEvmProviderConfig,
} from '../networkController';
import { selectSelectedInternalAccount } from '../accountsController';
import { createDeepEqualSelector } from '../util';
import { BtcScope, SolScope } from '@metamask/keyring-api';
import { selectConversionRate } from '../currencyRateController';
import { isMainNet } from '../../util/networks';
import { selectAccountBalanceByChainId } from '../accountTrackerController';
import { selectShowFiatInTestnets } from '../settings';
import {
  selectIsEvmNetworkSelected,
  selectSelectedNonEvmNetworkChainId,
  selectSelectedNonEvmNetworkSymbol,
} from '../multichainNetworkController';
import { parseCaipAssetType } from '@metamask/utils';
import BigNumber from 'bignumber.js';

/**
 * @deprecated TEMPORARY SOURCE OF TRUTH TBD
 * Native asset of each non evm network.
 */
export enum MultichainNativeAssets {
  Bitcoin = `${BtcScope.Mainnet}/slip44:0`,
  BitcoinTestnet = `${BtcScope.Testnet}/slip44:0`,
  Solana = `${SolScope.Mainnet}/slip44:501`,
  SolanaDevnet = `${SolScope.Devnet}/slip44:501`,
  SolanaTestnet = `${SolScope.Testnet}/slip44:501`,
}

/**
 * @deprecated TEMPORARY SOURCE OF TRUTH TBD
 * Maps network identifiers to their corresponding native asset types.
 * Each network is mapped to an array containing its native asset for consistency.
 */
export const MULTICHAIN_NETWORK_TO_ASSET_TYPES: Record<
  string,
  MultichainNativeAssets[]
> = {
  [SolScope.Mainnet]: [MultichainNativeAssets.Solana],
  [SolScope.Testnet]: [MultichainNativeAssets.SolanaTestnet],
  [SolScope.Devnet]: [MultichainNativeAssets.SolanaDevnet],
  [BtcScope.Mainnet]: [MultichainNativeAssets.Bitcoin],
  [BtcScope.Testnet]: [MultichainNativeAssets.BitcoinTestnet],
};

export const selectMultichainDefaultToken = createDeepEqualSelector(
  selectIsEvmNetworkSelected,
  selectEvmProviderConfig,
  selectSelectedNonEvmNetworkSymbol,
  (isEvmSelected, evmProviderConfig, nonEvmTicker) => {
    const symbol = isEvmSelected ? evmProviderConfig.ticker : nonEvmTicker;
    return { symbol };
  },
);

export const selectMultichainIsMainnet = createDeepEqualSelector(
  selectIsEvmNetworkSelected,
  selectSelectedInternalAccount,
  selectEvmChainId,
  selectChainId,
  (isEvmSelected, selectedAccount, evmChainId, chainId) => {
    if (isEvmSelected) {
      return isMainNet(evmChainId);
    }

    if (!selectedAccount) {
      return false;
    }

    const mainnet = (
      MULTICHAIN_ACCOUNT_TYPE_TO_MAINNET as Record<string, string>
    )[selectedAccount.type];
    return chainId === mainnet;
  },
);

/**
 *
 * @param state - Root redux state
 * @returns - MultichainBalancesController state
 */
const selectMultichainBalancesControllerState = (state: RootState) =>
  state.engine.backgroundState.MultichainBalancesController;

export const selectMultichainBalances = createDeepEqualSelector(
  selectMultichainBalancesControllerState,
  (multichainBalancesControllerState) =>
    multichainBalancesControllerState.balances,
);

export const selectMultichainShouldShowFiat = createDeepEqualSelector(
  selectMultichainIsMainnet,
  selectIsEvmNetworkSelected,
  selectShowFiatInTestnets,
  (multichainIsMainnet, isEvmSelected, shouldShowFiatOnTestnets) => {
    const isTestnet = !multichainIsMainnet;
    if (isEvmSelected) {
      return isTestnet ? shouldShowFiatOnTestnets : true; // Is it safe to assume that we default show fiat for mainnet?
    }
    return (
      multichainIsMainnet || (isTestnet && Boolean(shouldShowFiatOnTestnets))
    );
  },
);

const selectNonEvmCachedBalance = createDeepEqualSelector(
  selectSelectedInternalAccount,
  selectMultichainBalances,
  selectSelectedNonEvmNetworkChainId,
  (selectedInternalAccount, multichainBalances, nonEvmChainId) => {
    if (!selectedInternalAccount) {
      return undefined;
    }
    // We assume that there's at least one asset type in and that is the native
    // token for that network.
    const asset = MULTICHAIN_NETWORK_TO_ASSET_TYPES[nonEvmChainId]?.[0];
    const balancesForAccount = multichainBalances?.[selectedInternalAccount.id];
    const balanceOfAsset = balancesForAccount?.[asset];
    return balanceOfAsset?.amount ?? undefined;
  },
);

export const selectMultichainSelectedAccountCachedBalance =
  createDeepEqualSelector(
    selectIsEvmNetworkSelected,
    selectAccountBalanceByChainId,
    selectNonEvmCachedBalance,
    (isEvmSelected, accountBalanceByChainId, nonEvmCachedBalance) =>
      isEvmSelected
        ? accountBalanceByChainId?.balance ?? '0x0'
        : nonEvmCachedBalance,
  );

export function selectMultichainCoinRates(state: RootState) {
  return state.engine.backgroundState.RatesController.rates;
}

export const selectMultichainConversionRate = createDeepEqualSelector(
  selectIsEvmNetworkSelected,
  selectConversionRate,
  selectMultichainCoinRates,
  selectSelectedNonEvmNetworkSymbol,
  (isEvmSelected, evmConversionRate, multichaincCoinRates, nonEvmTicker) => {
    if (isEvmSelected) {
      return evmConversionRate;
    }
    // TODO: [SOLANA] - This should be mapping a caip-19 not a ticker
    return nonEvmTicker
      ? multichaincCoinRates?.[nonEvmTicker.toLowerCase()]?.conversionRate
      : undefined;
  },
);

/**
 *
 * @param state - Root redux state
 * @returns - MultichainTransactionsController state
 */
const selectMultichainTransactionsControllerState = (state: RootState) =>
  state.engine.backgroundState.MultichainTransactionsController;

export const selectMultichainTransactions = createDeepEqualSelector(
  selectMultichainTransactionsControllerState,
  (multichainTransactionsControllerState) =>
    multichainTransactionsControllerState.nonEvmTransactions,
);

export function selectMultichainAssets(state: RootState) {
  return state.engine.backgroundState.MultichainAssetsController.accountsAssets;
}

export function selectMultichainAssetsMetadata(state: RootState) {
  return state.engine.backgroundState.MultichainAssetsController.assetsMetadata;
}

export function selectMultichainAssetsRates(state: RootState) {
  return state.engine.backgroundState.MultichainAssetsRatesController
    .conversionRates;
}

export const selectMultichainTokenListForAccountId = createDeepEqualSelector(
  selectMultichainBalances,
  selectMultichainAssets,
  selectMultichainAssetsMetadata,
  selectMultichainAssetsRates,
  selectSelectedNonEvmNetworkChainId,
  (_: RootState, accountId: string | undefined) => accountId,
  (
    multichainBalances,
    assets,
    assetsMetadata,
    assetsRates,
    nonEvmNetworkChainId,
    accountId,
  ) => {
    if (!accountId) {
      return [];
    }

    const assetIds = assets?.[accountId] || [];
    const balances = multichainBalances?.[accountId];

    const tokens = [];

    for (const assetId of assetIds) {
      const { chainId, assetNamespace } = parseCaipAssetType(assetId);

      if (chainId !== nonEvmNetworkChainId) {
        continue;
      }

      const isNative = assetNamespace === 'slip44';
      const balance = balances?.[assetId] || { amount: undefined, unit: '' };
      const rate = assetsRates?.[assetId]?.rate || '0';
      const balanceInFiat = balance.amount
        ? new BigNumber(balance.amount).times(rate)
        : undefined;

      const assetMetadataFallback = {
        name: balance.unit || '',
        symbol: balance.unit || '',
        fungible: true,
        units: [{ name: assetId, symbol: balance.unit || '', decimals: 0 }],
      };

      const metadata = assetsMetadata[assetId] || assetMetadataFallback;
      const decimals = metadata.units[0]?.decimals || 0;

      tokens.push({
        name: metadata?.name,
        address: assetId,
        symbol: metadata?.symbol,
        image: metadata?.iconUrl,
        logo: metadata?.iconUrl,
        decimals,
        chainId,
        isNative,
        balance: balance.amount,
        secondary: balanceInFiat ? balanceInFiat.toString() : undefined,
        string: '',
        balanceFiat: balanceInFiat ? balanceInFiat.toString() : undefined,
        isStakeable: false,
        aggregators: [],
        isETH: false,
        ticker: metadata.symbol,
      });
    }

    return tokens;
  },
);

export const selectMultichainTokenList = createDeepEqualSelector(
  (state: RootState) => state,
  selectSelectedInternalAccount,
  (state, selectedAccount) => {
    return selectMultichainTokenListForAccountId(state, selectedAccount?.id);
  },
);

export const selectMultichainNetworkAggregatedBalance = createDeepEqualSelector(
  selectSelectedInternalAccount,
  selectMultichainBalances,
  selectMultichainAssets,
  selectMultichainAssetsRates,
  selectSelectedNonEvmNetworkChainId,
  (
    selectedAccountAddress,
    multichainBalances,
    assets,
    assetsRates,
    nonEvmNetworkChainId,
  ) => {
    if (!selectedAccountAddress) {
      return { totalBalance: '0', totalBalanceFiat: '0' };
    }

    const assetIds = assets?.[selectedAccountAddress.id] || [];
    const balances = multichainBalances?.[selectedAccountAddress.id];

    let totalBalance = new BigNumber(0);
    let totalBalanceFiat = new BigNumber(0);

    for (const assetId of assetIds) {
      const { chainId } = parseCaipAssetType(assetId);

      if (chainId !== nonEvmNetworkChainId) {
        continue;
      }

      const balance = balances?.[assetId] || { amount: '0', unit: '' };
      const rate = assetsRates?.[assetId]?.rate || '0';
      const balanceInFiat = new BigNumber(balance.amount).times(rate);

      totalBalance = totalBalance.plus(balance.amount);
      totalBalanceFiat = totalBalanceFiat.plus(balanceInFiat);
    }

    return {
      totalBalance: totalBalance.toString(),
      totalBalanceFiat: totalBalanceFiat.toString(),
    };
  },
);

const DEFAULT_TRANSACTION_STATE_ENTRY = {
  transactions: [],
  next: null,
  lastUpdated: 0,
};

export const selectSolanaAccountTransactions = createDeepEqualSelector(
  selectMultichainTransactions,
  selectSelectedInternalAccount,
  (nonEvmTransactions, selectedAccount) => {
    if (!selectedAccount) {
      return DEFAULT_TRANSACTION_STATE_ENTRY;
    }

    return (
      nonEvmTransactions[selectedAccount.id] ?? DEFAULT_TRANSACTION_STATE_ENTRY
    );
  },
);

export const selectNonEvmMarketData = createDeepEqualSelector(() => {
  // const foo = {
  //   'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501': {
  //     'swift:0/iso4217:EUR': {
  //       rate: '192.7893998785668999995',
  //       conversionTime: expect.any(Number),
  //       marketData: {
  //         marketCap: '58046480394.36662200758692138314',
  //         totalVolume: '3267284490.49121393197975318582',
  //         circulatingSupply: '512506275.4700137',
  //         allTimeHigh: '262.1029666127304599094',
  //         allTimeLow: '0.44751773816992952247',
  //         pricePercentChange: {
  //           PT1H: -0.7015657267954617,
  //           P1D: 1.6270441732346845,
  //           P7D: -10.985589910714582,
  //           P14D: 2.557473792001135,
  //           P30D: -11.519171371325216,
  //           P200D: -4.453777067234332,
  //           P1Y: -35.331458644625535,
  //         },
  //       },
  //     },
  //   },
  // };
  return {
    metadata: {
      rate: 192,
      conversionTime: 1,
    },
    marketData: {
      marketCap: '58046480394.36662200758692138314',
      totalVolume: '3267284490.49121393197975318582',
      circulatingSupply: '512506275.4700137',
      allTimeHigh: '262.1029666127304599094',
      allTimeLow: '0.44751773816992952247',
      pricePercentChange: {
        PT1H: -0.7015657267954617,
        P1D: 1.6270441732346845,
        P7D: -10.985589910714582,
        P14D: 2.557473792001135,
        P30D: -11.519171371325216,
        P200D: -4.453777067234332,
        P1Y: -35.331458644625535,
      },
    },
  };
});

export const selectNonEvmHistoricalPrices = createDeepEqualSelector(() => {
  return [
    [1744852868657, 1587.7826993717997],
    [1744853163168, 1587.5666721474715],
    [1744853476729, 1588.5060962617717],
    [1744853768678, 1589.7518862425538],
    [1744854048587, 1588.2535482546389],
    [1744854372896, 1586.3001652177684],
    [1744854676000, 1585.7053427720898],
    [1744854979459, 1586.5371394426681],
    [1744855546593, 1588.3277448989684],
    [1744855888030, 1587.6263628485442],
    [1744856155792, 1586.4615585911943],
    [1744856460855, 1585.2686827273596],
    [1744856760621, 1584.189526448111],
    [1744857063723, 1586.5028917191873],
    [1744857404406, 1586.49381823301],
    [1744857699557, 1586.5004167752825],
    [1744858005914, 1587.0058768143904],
    [1744858232515, 1588.6924897727677],
    [1744858520552, 1588.9171636661774],
    [1744858837371, 1590.3139010970751],
    [1744859187279, 1591.8052441011962],
    [1744859486728, 1591.9674160865266],
    [1744859717015, 1590.8272423752521],
    [1744860052877, 1589.1035084065734],
    [1744860357560, 1586.6279534479954],
    [1744860673558, 1582.7746066614043],
    [1744861005812, 1580.3583518119158],
    [1744861233930, 1580.2035339506606],
    [1744861544608, 1581.2614002007258],
    [1744861884481, 1582.0376882884777],
    [1744862199138, 1583.8880314334588],
    [1744862505087, 1584.624676647325],
    [1744862765580, 1584.8746373181095],
    [1744863081136, 1583.851860230055],
    [1744863398055, 1583.4693488507828],
    [1744863775004, 1583.0556190091197],
    [1744864005536, 1583.59408916772],
    [1744864303478, 1583.6852452335042],
    [1744864596765, 1583.217042981455],
    [1744864890482, 1582.1792142872416],
    [1744865138602, 1583.2639873192406],
    [1744865472446, 1586.4149872411872],
    [1744865753145, 1588.5591983977322],
    [1744866368264, 1591.1645306153443],
    [1744866769123, 1592.2458907190464],
    [1744867003499, 1593.9160207834632],
    [1744867273126, 1595.3781980923077],
    [1744867593375, 1595.98387078282],
    [1744867909390, 1595.6206516242155],
    [1744868161441, 1596.5920301482108],
    [1744868479419, 1598.3524628426594],
    [1744868781092, 1600.0816874925729],
    [1744869086940, 1600.9867384049205],
    [1744869396418, 1599.4690560520226],
    [1744869903304, 1598.9554225702957],
    [1744870046665, 1600.6537779056973],
    [1744870233648, 1601.9644529795708],
    [1744870537229, 1601.41928448162],
    [1744870869455, 1601.422395137542],
    [1744871125368, 1603.2600026789637],
    [1744871508423, 1606.4954692621156],
    [1744871740610, 1605.9622394538537],
    [1744872054121, 1605.497650237699],
    [1744872362350, 1604.8303435872142],
    [1744872679201, 1603.127093570277],
    [1744872962267, 1602.1370988916108],
    [1744873313620, 1602.6920425642081],
    [1744873549682, 1601.502068420932],
    [1744873868745, 1601.0001288543215],
    [1744874205620, 1600.6262700636914],
    [1744874500694, 1601.5126670133227],
    [1744874827828, 1603.3787406396998],
    [1744875060684, 1604.9335481837009],
    [1744875369444, 1607.11818014563],
    [1744875687741, 1605.6391865361425],
    [1744875954684, 1604.080340089033],
    [1744876304797, 1603.208180906588],
    [1744876531090, 1602.2377124057327],
    [1744876860433, 1601.7113530689048],
    [1744877172188, 1602.161574579998],
    [1744877504899, 1602.632655473047],
    [1744877795222, 1602.4795096547687],
    [1744878046858, 1601.7516015835163],
    [1744878367044, 1600.5816364205566],
    [1744878666622, 1600.6918965896052],
    [1744878925927, 1600.7772876313034],
    [1744879297762, 1600.946937179159],
    [1744879551377, 1601.3841606193926],
    [1744879857456, 1600.2714369452874],
    [1744880205341, 1597.9062010200603],
    [1744880478935, 1595.565652914133],
    [1744880795892, 1594.942012270257],
    [1744881032507, 1594.8782170889333],
    [1744881337653, 1594.175020250681],
    [1744881660829, 1593.542264167991],
    [1744881970347, 1594.7491352206127],
    [1744882328094, 1593.695495943136],
    [1744882570338, 1593.3967762258935],
    [1744882893119, 1593.9493223265474],
    [1744883135676, 1594.838491637501],
    [1744883470216, 1596.0017689024003],
    [1744883821060, 1594.6132873109188],
    [1744884066757, 1594.7851792380243],
    [1744884433057, 1594.7890663826915],
    [1744884705501, 1595.3755805213725],
    [1744884953534, 1592.587512218855],
    [1744885239936, 1591.381910666099],
    [1744885602583, 1592.6242583639264],
    [1744885907667, 1593.34756005475],
    [1744886141405, 1593.7310630667268],
    [1744886523787, 1593.3078660449887],
    [1744886747766, 1592.4403350441933],
    [1744887126638, 1592.3530635015802],
    [1744887382157, 1593.1678203045228],
    [1744887655410, 1593.1459655206127],
    [1744887979894, 1594.5228067776081],
    [1744888264816, 1594.1527169007293],
    [1744888557901, 1591.606435384504],
    [1744888872597, 1592.2242133859254],
    [1744889188041, 1592.5431040757974],
    [1744889454289, 1592.892704306799],
    [1744889724358, 1592.8006058860958],
    [1744890029223, 1592.8508315877818],
    [1744890327157, 1594.4069090934315],
    [1744890670846, 1595.2165663276285],
    [1744890984268, 1594.6968868933482],
    [1744891253530, 1593.9603382920711],
    [1744891537280, 1594.882342812219],
    [1744891866578, 1596.03291508205],
    [1744892187451, 1595.265942938719],
    [1744892570431, 1597.0617624783897],
    [1744892736487, 1598.332740911201],
    [1744893051201, 1600.070024676676],
    [1744893353647, 1599.2856320609576],
    [1744893678265, 1598.7584634181326],
    [1744894015997, 1598.7605975154218],
    [1744894315004, 1598.9288704741555],
    [1744894534753, 1599.3665309251874],
    [1744894892591, 1599.8897784110004],
    [1744895130581, 1599.5289789313244],
    [1744895484180, 1597.1033219433962],
    [1744895756293, 1595.7553439599067],
    [1744896089715, 1594.8036543898604],
    [1744896397075, 1594.7869063232401],
    [1744896688116, 1595.4607210591087],
    [1744896985535, 1593.0550930840209],
    [1744897291067, 1591.6872502821655],
    [1744897531286, 1593.2603738076805],
    [1744897818462, 1592.9132696585857],
    [1744898158957, 1594.7098763957288],
    [1744898735875, 1592.0467213316479],
    [1744898897567, 1591.323503603971],
    [1744899030970, 1590.1509456443846],
    [1744899332669, 1586.8743231719177],
    [1744899651341, 1583.15994896821],
    [1744899957403, 1580.936844590678],
    [1744900255041, 1578.0345837522943],
    [1744900516760, 1574.7719855910748],
    [1744900894841, 1570.0309174492843],
    [1744901122016, 1571.0296619589826],
    [1744901480582, 1573.3231878778522],
    [1744901729854, 1572.5916284177358],
    [1744902078824, 1571.301179521792],
    [1744902415720, 1572.2397549959032],
    [1744902683803, 1579.1133048336787],
    [1744902926376, 1583.2361247623162],
    [1744903262619, 1582.9459018284535],
    [1744903580049, 1581.1599273011223],
    [1744903886032, 1580.6875575371741],
    [1744904214737, 1581.9203472382007],
    [1744904481885, 1584.787012180431],
    [1744904812095, 1583.2196912318288],
    [1744905050603, 1582.9723897148365],
    [1744905384041, 1584.2156161990063],
    [1744905650727, 1583.710426871075],
    [1744905977226, 1582.0053016616544],
    [1744906290458, 1585.9723544015449],
    [1744906541117, 1586.5364170896592],
    [1744906835858, 1590.6063824316473],
    [1744907158157, 1596.5256816998972],
    [1744907434562, 1601.1994079706494],
    [1744907728981, 1606.6883642437692],
    [1744908076827, 1607.747199893262],
    [1744908315009, 1605.2163906630392],
    [1744908649822, 1602.2846997614429],
    [1744908992418, 1603.4434617780114],
    [1744909229491, 1604.4544612753516],
    [1744909530847, 1605.034143476199],
    [1744909834011, 1605.8585558590962],
    [1744910188843, 1607.7547075548803],
    [1744910452298, 1606.6570558179353],
    [1744910753256, 1605.4038062342224],
    [1744911030927, 1606.6228600864135],
    [1744911321120, 1607.0854023721968],
    [1744911678237, 1608.2709174414938],
    [1744911981754, 1607.9242775687528],
    [1744912277419, 1611.0902550976293],
    [1744912568186, 1612.7080660980016],
    [1744912854777, 1611.5233713288285],
    [1744913208998, 1610.9348975176697],
    [1744913461304, 1613.2307222095262],
    [1744913781095, 1612.8151762781454],
    [1744914026172, 1612.5030890681635],
    [1744914356421, 1612.9916873508816],
    [1744914659360, 1610.876396149564],
    [1744915012866, 1610.5146889467858],
    [1744915247532, 1610.6929452092545],
    [1744915567449, 1610.8040208016869],
    [1744915886372, 1609.1463011214641],
    [1744916143725, 1607.6659697207156],
    [1744916503794, 1605.6389188342014],
    [1744916761152, 1603.3085120310639],
    [1744917140176, 1601.4834331499187],
    [1744917325945, 1599.3553004332791],
    [1744917654709, 1591.668706782555],
    [1744917983167, 1586.1577927786],
    [1744918235090, 1583.7810576412394],
    [1744918591499, 1581.5171325959],
    [1744918894817, 1582.5618803048615],
    [1744919151947, 1584.0129876092335],
    [1744919433873, 1582.671799195007],
    [1744919778495, 1582.4695515599055],
    [1744920094726, 1582.7237410356167],
    [1744920419718, 1584.589613198027],
    [1744920623412, 1586.1314003778607],
    [1744920930926, 1586.2613630456729],
    [1744921254920, 1585.9866730121178],
    [1744921575014, 1586.6183102024647],
    [1744921911495, 1587.4563995928527],
    [1744922172259, 1586.1544548153172],
    [1744922504117, 1584.3953435132378],
    [1744922753381, 1584.573680142893],
    [1744923067250, 1585.8055082300812],
    [1744923388517, 1585.0496152518117],
    [1744923696472, 1584.22704611546],
    [1744923996791, 1584.273955213964],
    [1744924318160, 1584.2210003803798],
    [1744924535451, 1585.246337941124],
    [1744924868926, 1586.2916730771522],
    [1744925188234, 1585.4730660503162],
    [1744925487160, 1585.5669274062411],
    [1744925818289, 1586.0875338763435],
    [1744926114823, 1586.7213345014127],
    [1744926377761, 1586.3214214797028],
    [1744926651378, 1586.6955141168366],
    [1744926952943, 1587.2357740292],
    [1744927282807, 1588.204126280122],
    [1744927593334, 1589.0911069854217],
    [1744927904266, 1589.2464667844517],
    [1744928203707, 1590.415871936479],
    [1744928487324, 1590.5916602066204],
    [1744928761116, 1589.6021049123422],
    [1744929128145, 1589.5789648952823],
    [1744929336721, 1589.988002447582],
    [1744929632428, 1587.9733766529005],
    [1744929954937, 1586.7960836614925],
    [1744930270741, 1585.954179511203],
    [1744930582266, 1584.3180582857574],
    [1744931155690, 1581.9296620592859],
    [1744931447837, 1582.1417756666876],
    [1744931768447, 1583.4547038290298],
    [1744932079938, 1584.7672311124393],
    [1744932386587, 1586.562993900752],
    [1744932683803, 1588.067293364071],
    [1744932938508, 1587.8637114822964],
    [1744933227917, 1586.581887062791],
    [1744933564211, 1584.7021809144178],
    [1744933864030, 1583.7257726997946],
    [1744934174108, 1583.4764497002345],
    [1744934488751, 1583.445590655848],
    [1744934818043, 1583.089218197937],
    [1744935088430, 1582.6721640985238],
    [1744935340619, 1582.8818685948254],
    [1744935639327, 1581.5024034965443],
    [1744935943327, 1579.713349593325],
    [1744936279651, 1581.7485470857669],
    [1744936516811, 1582.707004664542],
    [1744936874214, 1582.0045638866782],
    [1744937159456, 1581.4205744130716],
    [1744937457631, 1581.0916430955879],
    [1744937771080, 1580.0114881465095],
    [1744938083755, 1579.8793504428193],
    [1744938388604, 1580.9451651400343],
    [1744938752067, 1583.7900223011113],
    [1744939069000, 1586.9750871083345],
  ];
});

///: END:ONLY_INCLUDE_IF
