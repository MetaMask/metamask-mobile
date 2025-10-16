import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { getPerpsTransactionsDetailsNavbar } from '../../Navbar';
import styleSheet from './HIP3DebugView.styles';
import {
  InfoClient,
  WebSocketTransport,
  ExchangeClient,
} from '@nktkas/hyperliquid';
import { store } from '../../../../store';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import Engine from '../../../../core/Engine';
import {
  calculateHip3AssetId,
  formatHyperLiquidPrice,
  quantizeDown,
  bumpByOneTick,
} from '../utils/hyperLiquidAdapter';

interface TestResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: string;
  error?: string;
}

const HIP3DebugView: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const [result, setResult] = useState<TestResult>({ status: 'idle' });
  const [balanceResult, setBalanceResult] = useState<TestResult>({
    status: 'idle',
  });
  const [orderResult, setOrderResult] = useState<TestResult>({
    status: 'idle',
  });
  const [listResult, setListResult] = useState<TestResult>({ status: 'idle' });
  const [closeResult, setCloseResult] = useState<TestResult>({
    status: 'idle',
  });
  const [transferToXyzResult, setTransferToXyzResult] = useState<TestResult>({
    status: 'idle',
  });
  const [transferFromXyzResult, setTransferFromXyzResult] =
    useState<TestResult>({
      status: 'idle',
    });
  const [transport] = useState(
    () =>
      new WebSocketTransport({
        isTestnet: false,
      }),
  );

  useEffect(() => {
    navigation.setOptions(
      getPerpsTransactionsDetailsNavbar(navigation, 'HIP-3 Asset ID Test'),
    );

    return () => {
      transport.close().catch(() => undefined);
    };
  }, [navigation, transport]);

  const checkAssetId = async () => {
    setResult({ status: 'loading' });
    DevLogger.log('=== CHECKING ASSET IDs ===');

    try {
      const infoClient = new InfoClient({ transport });

      DevLogger.log('Fetching meta for main DEX...');
      const mainMeta = await infoClient.meta();

      DevLogger.log('Fetching meta for xyz DEX...');
      const xyzMeta = await infoClient.meta({ dex: 'xyz' });

      const mainAsset0 = mainMeta.universe[0];
      const xyzAsset0 = xyzMeta.universe[0];

      const output = [
        '=== ASSET ID 0 COMPARISON ===',
        '',
        'Main DEX (asset ID 0):',
        `  Name: ${mainAsset0?.name || 'N/A'}`,
        `  szDecimals: ${mainAsset0?.szDecimals ?? 'N/A'}`,
        '',
        'xyz DEX (asset ID 0):',
        `  Name: ${xyzAsset0?.name || 'N/A'}`,
        `  szDecimals: ${xyzAsset0?.szDecimals ?? 'N/A'}`,
        '',
        '=== CONCLUSION ===',
        '✅ Both use asset ID 0, but different assets!',
        `   Main DEX: "${mainAsset0?.name || 'N/A'}"`,
        `   xyz DEX:  "${xyzAsset0?.name || 'N/A'}"`,
        '',
        '❓ How does HyperLiquid route orders?',
        '   When you send {a: 0, b: true, ...}',
        '   How does it know which DEX you mean?',
      ].join('\n');

      DevLogger.log(output);

      setResult({
        status: 'success',
        data: output,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      DevLogger.log('❌ Asset ID check failed:', error);
      setResult({ status: 'error', error: errorMsg });
    }
  };

  const checkBalances = async () => {
    setBalanceResult({ status: 'loading' });
    DevLogger.log('=== CHECKING BALANCES ===');

    try {
      const selectedEvmAccount = selectSelectedInternalAccountByScope(
        store.getState(),
      )('eip155:1');

      if (!selectedEvmAccount?.address) {
        throw new Error('No account selected');
      }

      const address = selectedEvmAccount.address;
      const infoClient = new InfoClient({ transport });

      DevLogger.log(`Fetching balance for ${address}...`);

      DevLogger.log('Fetching main DEX balance...');
      const mainBalance = await infoClient.clearinghouseState({
        user: address,
      });

      DevLogger.log('Fetching xyz DEX balance...');
      const xyzBalance = await infoClient.clearinghouseState({
        user: address,
        dex: 'xyz',
      });

      const output = [
        '=== BALANCE COMPARISON ===',
        '',
        'Main DEX:',
        `  Account Value: $${parseFloat(
          mainBalance.marginSummary.accountValue,
        ).toFixed(2)}`,
        `  Withdrawable: $${parseFloat(mainBalance.withdrawable).toFixed(2)}`,
        `  Margin Used: $${parseFloat(
          mainBalance.marginSummary.totalMarginUsed,
        ).toFixed(2)}`,
        '',
        'xyz DEX:',
        `  Account Value: $${parseFloat(
          xyzBalance.marginSummary.accountValue,
        ).toFixed(2)}`,
        `  Withdrawable: $${parseFloat(xyzBalance.withdrawable).toFixed(2)}`,
        `  Margin Used: $${parseFloat(
          xyzBalance.marginSummary.totalMarginUsed,
        ).toFixed(2)}`,
      ].join('\n');

      DevLogger.log(output);

      setBalanceResult({
        status: 'success',
        data: output,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      DevLogger.log('❌ Balance check failed:', error);
      setBalanceResult({ status: 'error', error: errorMsg });
    }
  };

  const transferToXyzDex = async () => {
    setTransferToXyzResult({ status: 'loading' });
    DevLogger.log('=== TRANSFERRING $11 TO XYZ DEX ===');

    try {
      const selectedEvmAccount = selectSelectedInternalAccountByScope(
        store.getState(),
      )('eip155:1');

      if (!selectedEvmAccount?.address) {
        throw new Error('No account selected');
      }

      const address = selectedEvmAccount.address;

      // Fetch correct USDC token ID from spotMeta
      const infoClient = new InfoClient({ transport });
      DevLogger.log('Fetching spot metadata...');
      const spotMeta = await infoClient.spotMeta();
      const usdcToken = spotMeta.tokens.find((t) => t.name === 'USDC');

      if (!usdcToken) {
        throw new Error('USDC token not found in spotMeta');
      }

      DevLogger.log(`Found USDC token ID: ${usdcToken.tokenId}`);

      const { KeyringController } = Engine.context;
      const wallet = {
        signTypedData: async (params: {
          domain: {
            name: string;
            version: string;
            chainId: number;
            verifyingContract: `0x${string}`;
          };
          types: {
            [key: string]: { name: string; type: string }[];
          };
          primaryType: string;
          message: Record<string, unknown>;
        }) => {
          const sig = await KeyringController.signTypedMessage(
            {
              data: JSON.stringify(params),
              from: address,
            },
            'V4' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          );
          return sig as `0x${string}`;
        },
      };

      const exchangeClient = new ExchangeClient({
        transport,
        wallet: wallet as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      DevLogger.log('Sending $11 USDC from main DEX to xyz DEX...');
      const transferResult = await exchangeClient.sendAsset({
        destination: address as `0x${string}`,
        sourceDex: '',
        destinationDex: 'xyz',
        token: `USDC:${usdcToken.tokenId}` as `${string}:0x${string}`,
        amount: '11',
      });

      const output = [
        '=== TRANSFER TO XYZ DEX ===',
        '',
        'Transferred: $11 USDC',
        'From: Main DEX',
        'To: xyz DEX',
        '',
        'Result:',
        JSON.stringify(transferResult, null, 2),
      ].join('\n');

      DevLogger.log(output);

      setTransferToXyzResult({
        status: 'success',
        data: output,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      DevLogger.log('❌ Transfer to xyz DEX failed:', error);
      setTransferToXyzResult({ status: 'error', error: errorMsg });
    }
  };

  const transferFromXyzDex = async () => {
    setTransferFromXyzResult({ status: 'loading' });
    DevLogger.log('=== TRANSFERRING $11 FROM XYZ DEX ===');

    try {
      const selectedEvmAccount = selectSelectedInternalAccountByScope(
        store.getState(),
      )('eip155:1');

      if (!selectedEvmAccount?.address) {
        throw new Error('No account selected');
      }

      const address = selectedEvmAccount.address;

      // Fetch correct USDC token ID from spotMeta
      const infoClient = new InfoClient({ transport });
      DevLogger.log('Fetching spot metadata...');
      const spotMeta = await infoClient.spotMeta();
      const usdcToken = spotMeta.tokens.find((t) => t.name === 'USDC');

      if (!usdcToken) {
        throw new Error('USDC token not found in spotMeta');
      }

      DevLogger.log(`Found USDC token ID: ${usdcToken.tokenId}`);

      const { KeyringController } = Engine.context;
      const wallet = {
        signTypedData: async (params: {
          domain: {
            name: string;
            version: string;
            chainId: number;
            verifyingContract: `0x${string}`;
          };
          types: {
            [key: string]: { name: string; type: string }[];
          };
          primaryType: string;
          message: Record<string, unknown>;
        }) => {
          const sig = await KeyringController.signTypedMessage(
            {
              data: JSON.stringify(params),
              from: address,
            },
            'V4' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          );
          return sig as `0x${string}`;
        },
      };

      const exchangeClient = new ExchangeClient({
        transport,
        wallet: wallet as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      DevLogger.log('Sending $11 USDC from xyz DEX to main DEX...');
      const transferResult = await exchangeClient.sendAsset({
        destination: address as `0x${string}`,
        sourceDex: 'xyz',
        destinationDex: '',
        token: `USDC:${usdcToken.tokenId}` as `${string}:0x${string}`,
        amount: '11',
      });

      const output = [
        '=== TRANSFER FROM XYZ DEX ===',
        '',
        'Transferred: $11 USDC',
        'From: xyz DEX',
        'To: Main DEX',
        '',
        'Result:',
        JSON.stringify(transferResult, null, 2),
      ].join('\n');

      DevLogger.log(output);

      setTransferFromXyzResult({
        status: 'success',
        data: output,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      DevLogger.log('❌ Transfer from xyz DEX failed:', error);
      setTransferFromXyzResult({ status: 'error', error: errorMsg });
    }
  };

  const placeXyzOrder = async () => {
    setOrderResult({ status: 'loading' });
    DevLogger.log('=== PLACING XYZ ORDER ===');

    try {
      const selectedEvmAccount = selectSelectedInternalAccountByScope(
        store.getState(),
      )('eip155:1');

      if (!selectedEvmAccount?.address) {
        throw new Error('No account selected');
      }

      const address = selectedEvmAccount.address;
      const infoClient = new InfoClient({ transport });

      DevLogger.log('Fetching xyz DEX meta...');
      const xyzMeta = await infoClient.meta({ dex: 'xyz' });

      DevLogger.log('Fetching perpDexs...');
      const perpDexs = await infoClient.perpDexs();

      const xyzIndex = perpDexs.findIndex((dex) => dex?.name === 'xyz');
      if (xyzIndex === -1) {
        throw new Error('xyz DEX not found in perpDexs');
      }

      const assetId = calculateHip3AssetId(xyzIndex, 0);

      DevLogger.log('Fetching current price...');
      const allMids = await infoClient.allMids({ dex: 'xyz' });
      const currentPrice = parseFloat(allMids[xyzMeta.universe[0].name]);

      // Calculate cap price for slippage (buy: accept higher price)
      const slippage = 0.05;
      const capPrice = currentPrice * (1 + slippage);

      // IMPORTANT: HyperLiquid validates notional at MID price, not limit price!
      // Must ensure size * midPrice >= $10, even though we're sending size * capPrice
      const minUsd = 10;
      const targetUsd = 10.25;

      // Calculate size from MID price (not cap price!) to ensure validation passes
      let size = targetUsd / currentPrice;
      DevLogger.log(`Before quantize: size=${size}`);

      size = quantizeDown({
        value: size,
        decimals: xyzMeta.universe[0].szDecimals,
      });
      DevLogger.log(`After quantize: size=${size}`);

      // Format cap price for the order
      const formattedPrice = formatHyperLiquidPrice({
        price: capPrice,
        szDecimals: xyzMeta.universe[0].szDecimals,
      });

      // Verify notional at MID price (this is what HyperLiquid validates!)
      const notionalAtMid = size * currentPrice;
      DevLogger.log(`Notional at mid: ${notionalAtMid} (validation price)`);
      DevLogger.log(
        `Notional at cap: ${size * parseFloat(formattedPrice)} (order price)`,
      );
      DevLogger.log(
        `Notional check: ${notionalAtMid} < ${minUsd} = ${
          notionalAtMid < minUsd
        }`,
      );

      if (notionalAtMid < minUsd) {
        const beforeBump = size;
        size = bumpByOneTick({
          value: size,
          decimals: xyzMeta.universe[0].szDecimals,
        });
        DevLogger.log(`Bumped size: ${beforeBump} → ${size}`);
        DevLogger.log(`New notional at mid: ${size * currentPrice}`);
      }

      const { KeyringController } = Engine.context;
      const wallet = {
        signTypedData: async (params: {
          domain: {
            name: string;
            version: string;
            chainId: number;
            verifyingContract: `0x${string}`;
          };
          types: {
            [key: string]: { name: string; type: string }[];
          };
          primaryType: string;
          message: Record<string, unknown>;
        }) => {
          const sig = await KeyringController.signTypedMessage(
            {
              data: JSON.stringify(params),
              from: address,
            },
            'V4' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          );
          return sig as `0x${string}`;
        },
      };

      const exchangeClient = new ExchangeClient({
        transport,
        wallet: wallet as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      const notionalAtCapPrice = size * parseFloat(formattedPrice);
      const finalNotionalAtMid = size * currentPrice;
      const sizeString = size.toString();

      DevLogger.log('Market order details:', {
        assetId,
        currentPrice,
        capPrice,
        targetUsd,
        size,
        sizeString,
        formattedPrice,
        notionalAtMid: finalNotionalAtMid,
        notionalAtCapPrice,
        meetsMinimum: finalNotionalAtMid >= minUsd,
      });

      const orderParams = {
        a: assetId,
        b: true,
        p: formattedPrice,
        s: sizeString,
        r: false,
        t: { limit: { tif: 'Ioc' as const } },
      };

      DevLogger.log(
        'Sending order to HyperLiquid:',
        JSON.stringify(orderParams, null, 2),
      );

      const placeOrderResult = await exchangeClient.order({
        orders: [orderParams],
      });

      const output = [
        '=== ORDER PLACED ===',
        '',
        `xyz DEX Index: ${xyzIndex}`,
        `Asset ID (calculated): ${assetId}`,
        `Asset Name: ${xyzMeta.universe[0].name}`,
        `Mid Price: $${currentPrice}`,
        `Cap Price (with ${(slippage * 100).toFixed(
          1,
        )}% slippage): $${capPrice}`,
        `Formatted Price: $${formattedPrice}`,
        `Size: ${size}`,
        `Notional at Mid: $${finalNotionalAtMid.toFixed(2)}`,
        `Notional at Cap: $${notionalAtCapPrice.toFixed(2)}`,
        `Meets $${minUsd} minimum: ${
          finalNotionalAtMid >= minUsd ? '✅' : '❌'
        }`,
        '',
        'Result:',
        JSON.stringify(placeOrderResult, null, 2),
      ].join('\n');

      DevLogger.log(output);

      setOrderResult({
        status: 'success',
        data: output,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      DevLogger.log('❌ Order placement failed:', error);
      setOrderResult({ status: 'error', error: errorMsg });
    }
  };

  const listXyzPositions = async () => {
    setListResult({ status: 'loading' });
    DevLogger.log('=== LISTING XYZ POSITIONS ===');

    try {
      const selectedEvmAccount = selectSelectedInternalAccountByScope(
        store.getState(),
      )('eip155:1');

      if (!selectedEvmAccount?.address) {
        throw new Error('No account selected');
      }

      const address = selectedEvmAccount.address;
      const infoClient = new InfoClient({ transport });

      DevLogger.log('Fetching xyz DEX state...');
      const xyzState = await infoClient.clearinghouseState({
        user: address,
        dex: 'xyz',
      });

      DevLogger.log('Fetching xyz DEX orders...');
      const xyzOrders = await infoClient.frontendOpenOrders({
        user: address,
        dex: 'xyz',
      });

      const output = [
        '=== XYZ DEX STATE ===',
        '',
        'Positions:',
        xyzState.assetPositions.length > 0
          ? xyzState.assetPositions
              .map(
                (pos) =>
                  `  ${pos.position.coin}: size=${pos.position.szi}, pnl=${pos.position.unrealizedPnl}`,
              )
              .join('\n')
          : '  (none)',
        '',
        'Open Orders:',
        xyzOrders.length > 0
          ? xyzOrders
              .map(
                (order) =>
                  `  ${order.coin}: ${order.side} ${order.sz} @ ${order.limitPx}`,
              )
              .join('\n')
          : '  (none)',
      ].join('\n');

      DevLogger.log(output);

      setListResult({
        status: 'success',
        data: output,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      DevLogger.log('❌ List positions failed:', error);
      setListResult({ status: 'error', error: errorMsg });
    }
  };

  const closeXyzPositions = async () => {
    setCloseResult({ status: 'loading' });
    DevLogger.log('=== CLOSING XYZ POSITIONS ===');

    try {
      const selectedEvmAccount = selectSelectedInternalAccountByScope(
        store.getState(),
      )('eip155:1');

      if (!selectedEvmAccount?.address) {
        throw new Error('No account selected');
      }

      const address = selectedEvmAccount.address;
      const infoClient = new InfoClient({ transport });

      DevLogger.log('Fetching xyz DEX state...');
      const xyzState = await infoClient.clearinghouseState({
        user: address,
        dex: 'xyz',
      });

      if (xyzState.assetPositions.length === 0) {
        setCloseResult({
          status: 'success',
          data: 'No positions to close',
        });
        return;
      }

      DevLogger.log('Fetching perpDexs...');
      const perpDexs = await infoClient.perpDexs();
      const xyzIndex = perpDexs.findIndex((dex) => dex?.name === 'xyz');

      DevLogger.log('Fetching xyz meta...');
      const xyzMeta = await infoClient.meta({ dex: 'xyz' });

      DevLogger.log('Fetching current prices...');
      const allMids = await infoClient.allMids({ dex: 'xyz' });

      const { KeyringController } = Engine.context;
      const wallet = {
        signTypedData: async (params: {
          domain: {
            name: string;
            version: string;
            chainId: number;
            verifyingContract: `0x${string}`;
          };
          types: {
            [key: string]: { name: string; type: string }[];
          };
          primaryType: string;
          message: Record<string, unknown>;
        }) => {
          const sig = await KeyringController.signTypedMessage(
            {
              data: JSON.stringify(params),
              from: address,
            },
            'V4' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          );
          return sig as `0x${string}`;
        },
      };

      const exchangeClient = new ExchangeClient({
        transport,
        wallet: wallet as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      const closeOrders = xyzState.assetPositions.map((pos) => {
        const assetIndex = xyzMeta.universe.findIndex(
          (a) => a.name === pos.position.coin,
        );
        const assetId = calculateHip3AssetId(xyzIndex, assetIndex);
        const asset = xyzMeta.universe[assetIndex];
        const rawPrice = parseFloat(allMids[pos.position.coin]);
        const positionSize = parseFloat(pos.position.szi);
        const isBuy = positionSize < 0;

        // Add 10% slippage for illiquid HIP-3 markets
        const slippage = 0.1;
        const priceWithSlippage = isBuy
          ? rawPrice * (1 + slippage) // Buy to close short: accept higher price
          : rawPrice * (1 - slippage); // Sell to close long: accept lower price

        const formattedPrice = formatHyperLiquidPrice({
          price: priceWithSlippage,
          szDecimals: asset.szDecimals,
        });
        const size = Math.abs(positionSize);

        DevLogger.log('Close order details:', {
          coin: pos.position.coin,
          assetId,
          positionSize,
          isBuy,
          rawPrice,
          priceWithSlippage,
          formattedPrice,
          size,
        });

        return {
          a: assetId,
          b: isBuy,
          p: formattedPrice,
          s: size.toString(),
          r: true,
          t: { limit: { tif: 'FrontendMarket' as const } },
        };
      });

      DevLogger.log(
        `Closing ${closeOrders.length} positions with reduce-only orders`,
      );
      const closedPositionsResult = await exchangeClient.order({
        orders: closeOrders,
      });

      const output = [
        '=== POSITIONS CLOSED ===',
        '',
        `Closed ${closeOrders.length} position(s)`,
        '',
        'Result:',
        JSON.stringify(closedPositionsResult, null, 2),
      ].join('\n');

      DevLogger.log(output);

      setCloseResult({
        status: 'success',
        data: output,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      DevLogger.log('❌ Close positions failed:', error);
      setCloseResult({ status: 'error', error: errorMsg });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView>
        <View style={styles.header}>
          <Text variant={TextVariant.HeadingLG}>HIP-3 Asset ID Test</Text>
          <Text variant={TextVariant.BodySM} style={styles.subtitle}>
            Direct SDK test - no provider abstraction
          </Text>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.button} onPress={checkAssetId}>
            <Text variant={TextVariant.BodyMD} style={styles.buttonText}>
              Check Asset ID 0
            </Text>
          </TouchableOpacity>

          {result.status === 'loading' && (
            <ActivityIndicator style={styles.loader} />
          )}

          {result.status === 'error' && (
            <View style={styles.errorBox}>
              <Text variant={TextVariant.BodySM} style={styles.errorText}>
                ❌ {result.error}
              </Text>
            </View>
          )}

          {result.status === 'success' && (
            <View style={styles.resultBox}>
              <Text variant={TextVariant.BodyXS} style={styles.resultText}>
                {result.data}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.button} onPress={checkBalances}>
            <Text variant={TextVariant.BodyMD} style={styles.buttonText}>
              Check Balances
            </Text>
          </TouchableOpacity>

          {balanceResult.status === 'loading' && (
            <ActivityIndicator style={styles.loader} />
          )}

          {balanceResult.status === 'error' && (
            <View style={styles.errorBox}>
              <Text variant={TextVariant.BodySM} style={styles.errorText}>
                ❌ {balanceResult.error}
              </Text>
            </View>
          )}

          {balanceResult.status === 'success' && (
            <View style={styles.resultBox}>
              <Text variant={TextVariant.BodyXS} style={styles.resultText}>
                {balanceResult.data}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.button} onPress={transferToXyzDex}>
            <Text variant={TextVariant.BodyMD} style={styles.buttonText}>
              Transfer $11 → xyz DEX
            </Text>
          </TouchableOpacity>

          {transferToXyzResult.status === 'loading' && (
            <ActivityIndicator style={styles.loader} />
          )}

          {transferToXyzResult.status === 'error' && (
            <View style={styles.errorBox}>
              <Text variant={TextVariant.BodySM} style={styles.errorText}>
                ❌ {transferToXyzResult.error}
              </Text>
            </View>
          )}

          {transferToXyzResult.status === 'success' && (
            <View style={styles.resultBox}>
              <Text variant={TextVariant.BodyXS} style={styles.resultText}>
                {transferToXyzResult.data}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.button} onPress={transferFromXyzDex}>
            <Text variant={TextVariant.BodyMD} style={styles.buttonText}>
              Transfer $11 ← xyz DEX
            </Text>
          </TouchableOpacity>

          {transferFromXyzResult.status === 'loading' && (
            <ActivityIndicator style={styles.loader} />
          )}

          {transferFromXyzResult.status === 'error' && (
            <View style={styles.errorBox}>
              <Text variant={TextVariant.BodySM} style={styles.errorText}>
                ❌ {transferFromXyzResult.error}
              </Text>
            </View>
          )}

          {transferFromXyzResult.status === 'success' && (
            <View style={styles.resultBox}>
              <Text variant={TextVariant.BodyXS} style={styles.resultText}>
                {transferFromXyzResult.data}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.button} onPress={placeXyzOrder}>
            <Text variant={TextVariant.BodyMD} style={styles.buttonText}>
              Place xyz Order ($10)
            </Text>
          </TouchableOpacity>

          {orderResult.status === 'loading' && (
            <ActivityIndicator style={styles.loader} />
          )}

          {orderResult.status === 'error' && (
            <View style={styles.errorBox}>
              <Text variant={TextVariant.BodySM} style={styles.errorText}>
                ❌ {orderResult.error}
              </Text>
            </View>
          )}

          {orderResult.status === 'success' && (
            <View style={styles.resultBox}>
              <Text variant={TextVariant.BodyXS} style={styles.resultText}>
                {orderResult.data}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.button} onPress={listXyzPositions}>
            <Text variant={TextVariant.BodyMD} style={styles.buttonText}>
              List xyz Positions/Orders
            </Text>
          </TouchableOpacity>

          {listResult.status === 'loading' && (
            <ActivityIndicator style={styles.loader} />
          )}

          {listResult.status === 'error' && (
            <View style={styles.errorBox}>
              <Text variant={TextVariant.BodySM} style={styles.errorText}>
                ❌ {listResult.error}
              </Text>
            </View>
          )}

          {listResult.status === 'success' && (
            <View style={styles.resultBox}>
              <Text variant={TextVariant.BodyXS} style={styles.resultText}>
                {listResult.data}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.button} onPress={closeXyzPositions}>
            <Text variant={TextVariant.BodyMD} style={styles.buttonText}>
              Close All xyz Positions
            </Text>
          </TouchableOpacity>

          {closeResult.status === 'loading' && (
            <ActivityIndicator style={styles.loader} />
          )}

          {closeResult.status === 'error' && (
            <View style={styles.errorBox}>
              <Text variant={TextVariant.BodySM} style={styles.errorText}>
                ❌ {closeResult.error}
              </Text>
            </View>
          )}

          {closeResult.status === 'success' && (
            <View style={styles.resultBox}>
              <Text variant={TextVariant.BodyXS} style={styles.resultText}>
                {closeResult.data}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HIP3DebugView;
