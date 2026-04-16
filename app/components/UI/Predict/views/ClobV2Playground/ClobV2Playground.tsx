import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { ORIGIN_METAMASK, query } from '@metamask/controller-utils';
import EthQuery from '@metamask/eth-query';
import {
  Box,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import {
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import { Hex, numberToHex } from '@metamask/utils';
import { ethers } from 'ethers';
import { Interface } from 'ethers/lib/utils';
import Engine from '../../../../../core/Engine';
import { selectSelectedAccountGroupId } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { isSmartContractAddress } from '../../../../../util/transactions';
import {
  COLLATERAL_ONRAMP_ADDRESS,
  MATIC_CONTRACTS,
  POLYGON_MAINNET_CHAIN_ID,
  USDC_E_ADDRESS,
} from '../../providers/polymarket/constants';
import {
  aggregateTransaction,
  computeProxyAddress,
  createAllowancesSafeTransaction,
  getSafeTransactionCallData,
  hasAllowances,
} from '../../providers/polymarket/safe/utils';
import {
  outcomeTokenSpenders,
  PERMIT2_ADDRESS,
  pUsdSpenders,
  usdcESpenders,
} from '../../providers/polymarket/safe/constants';
import { OperationType } from '../../providers/polymarket/safe/types';
import { Signer } from '../../providers/types';
import {
  encodeApprove,
  encodeErc1155Approve,
  encodeWrap,
  getBalance,
} from '../../providers/polymarket/utils';
import PredictMarketOutcome from '../../components/PredictMarketOutcome';
import PredictPositionDetail from '../../components/PredictPositionDetail';
import { usePredictMarket } from '../../hooks/usePredictMarket';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import { PredictMarketStatus } from '../../types';
import { getEvmAccountFromSelectedAccountGroup } from '../../utils/accounts';

interface PlaygroundState {
  safeAddress: string;
  pUsdBalance: number;
  usdcEBalance: number;
  isDeployed: boolean;
  hasAllowances: boolean;
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

interface InfoRowProps {
  label: string;
  value: string;
  valueColor?: TextColor;
}

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

const formatTokenBalance = (value?: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(4) : '--';

const truncateAddress = (value?: string) =>
  value ? `${value.slice(0, 6)}...${value.slice(-4)}` : '--';

const confirmAction = (title: string, message: string) =>
  new Promise<boolean>((resolve) => {
    Alert.alert(title, message, [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => resolve(false),
      },
      {
        text: 'Continue',
        onPress: () => resolve(true),
      },
    ]);
  });

const getPolygonNetworkClientId = () =>
  Engine.context.NetworkController.findNetworkClientIdByChainId(
    numberToHex(POLYGON_MAINNET_CHAIN_ID),
  );

const getErc20Balance = async ({
  tokenAddress,
  owner,
}: {
  tokenAddress: string;
  owner: string;
}): Promise<number> => {
  const networkClientId = getPolygonNetworkClientId();

  if (!networkClientId) {
    throw new Error('Polygon network client not found');
  }

  const provider =
    Engine.context.NetworkController.getNetworkClientById(
      networkClientId,
    )?.provider;

  if (!provider) {
    throw new Error('Polygon provider not available');
  }

  const ethQuery = new EthQuery(provider);
  const data = new Interface([
    'function balanceOf(address owner) view returns (uint256)',
  ]).encodeFunctionData('balanceOf', [owner]);

  const result = (await query(ethQuery, 'call', [
    {
      to: tokenAddress,
      data,
    },
  ])) as Hex;

  return Number(BigInt(result)) / 1e6;
};

const getErc20BalanceRaw = async ({
  tokenAddress,
  owner,
}: {
  tokenAddress: string;
  owner: string;
}): Promise<bigint> => {
  const networkClientId = getPolygonNetworkClientId();

  if (!networkClientId) {
    throw new Error('Polygon network client not found');
  }

  const provider =
    Engine.context.NetworkController.getNetworkClientById(
      networkClientId,
    )?.provider;

  if (!provider) {
    throw new Error('Polygon provider not available');
  }

  const ethQuery = new EthQuery(provider);
  const data = new Interface([
    'function balanceOf(address owner) view returns (uint256)',
  ]).encodeFunctionData('balanceOf', [owner]);

  const result = (await query(ethQuery, 'call', [
    {
      to: tokenAddress,
      data,
    },
  ])) as Hex;

  return BigInt(result);
};

const usePlaygroundState = (address: string | undefined) => {
  const [state, setState] = useState<PlaygroundState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address) {
      setState(null);
      setError('No selected account');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const safeAddress = computeProxyAddress(address);
      const [pUsdBalance, usdcEBalance, isDeployed, allowancesReady] =
        await Promise.all([
          getBalance({ address: safeAddress }),
          getErc20Balance({
            tokenAddress: USDC_E_ADDRESS,
            owner: safeAddress,
          }),
          isSmartContractAddress(
            safeAddress,
            numberToHex(POLYGON_MAINNET_CHAIN_ID),
          ),
          hasAllowances({
            address: safeAddress,
            extraPusdSpenders: [PERMIT2_ADDRESS],
          }),
        ]);

      setState({
        safeAddress,
        pUsdBalance,
        usdcEBalance,
        isDeployed,
        hasAllowances: allowancesReady,
      });
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'Failed to refresh state',
      );
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { state, loading, error, refresh };
};

const Section = ({ title, children }: SectionProps) => (
  <Box twClassName="rounded-2xl border border-default bg-default p-4 gap-4">
    <Text variant={TextVariant.HeadingSm} color={TextColor.TextDefault}>
      {title}
    </Text>
    {children}
  </Box>
);

const InfoRow = ({
  label,
  value,
  valueColor = TextColor.TextDefault,
}: InfoRowProps) => (
  <Box twClassName="flex-row items-center justify-between gap-3">
    <Text variant={TextVariant.BodyMd} color={TextColor.TextMuted}>
      {label}
    </Text>
    <Text variant={TextVariant.BodyMd} color={valueColor}>
      {value}
    </Text>
  </Box>
);

const ActionButton = ({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
}: ActionButtonProps) => {
  const tw = useTailwind();
  const baseClassName =
    variant === 'primary'
      ? 'bg-muted border-default'
      : 'bg-default border-default';

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) =>
        tw.style(
          `rounded-2xl border px-4 py-3 ${baseClassName}`,
          pressed && !disabled && 'opacity-80',
          disabled && 'opacity-50',
        )
      }
    >
      <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
        {label}
      </Text>
    </Pressable>
  );
};

const ClobV2Playground = () => {
  const TEST_MARKET_ID = '79831';
  const tw = useTailwind();
  const navigation = useNavigation();
  const isMountedRef = useRef(true);

  useSelector(selectSelectedAccountGroupId);
  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const address = evmAccount?.address;

  const { state, loading, error, refresh } = usePlaygroundState(address);
  const { data: marketData, isLoading: isMarketLoading } = usePredictMarket({
    id: TEST_MARKET_ID,
    enabled: true,
  });
  const { data: positions, isLoading: isPositionsLoading } =
    usePredictPositions({
      marketId: TEST_MARKET_ID,
      claimable: false,
      enabled: true,
    });

  const [status, setStatus] = useState('No actions yet');
  const [isUpgradeLoading, setIsUpgradeLoading] = useState(false);
  const [isDowngradeLoading, setIsDowngradeLoading] = useState(false);

  useEffect(() => () => {
      isMountedRef.current = false;
    }, []);

  const signer = useMemo<Signer | null>(() => {
    if (!address) {
      return null;
    }

    return {
      address,
      signTypedMessage: (msgParams, version = SignTypedDataVersion.V4) =>
        Engine.context.KeyringController.signTypedMessage(msgParams, version),
      signPersonalMessage: (msgParams) =>
        Engine.context.KeyringController.signPersonalMessage(msgParams),
    };
  }, [address]);

  const networkClientId = useMemo(() => getPolygonNetworkClientId(), []);

  const submitTransaction = useCallback(
    async ({
      to,
      data,
      type,
    }: {
      to: string;
      data: string;
      type: TransactionType;
    }) => {
      if (!address) {
        throw new Error('No selected account address');
      }

      if (!networkClientId) {
        throw new Error('Polygon network client not found');
      }

      await Engine.context.TransactionController.addTransaction(
        {
          from: address,
          to,
          data,
          chainId: numberToHex(POLYGON_MAINNET_CHAIN_ID),
        },
        {
          networkClientId,
          origin: ORIGIN_METAMASK,
          type,
          deviceConfirmedOn: WalletDevice.MM_MOBILE,
        },
      );
    },
    [address, networkClientId],
  );

  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const handleUpgrade = useCallback(async () => {
    if (!signer || !address) {
      setStatus('Upgrade unavailable: missing signer');
      return;
    }

    const confirmed = await confirmAction(
      'Upgrade to v2',
      'This will set v2 allowances and wrap Safe USDC.e into pUSD.',
    );

    if (!confirmed) {
      return;
    }

    setIsUpgradeLoading(true);
    setStatus('Submitting upgrade transactions...');

    try {
      const safeAddress = computeProxyAddress(address);
      const allowanceSafeTxn = createAllowancesSafeTransaction({
        extraPusdSpenders: [PERMIT2_ADDRESS],
      });
      const usdcEBalance = await getErc20BalanceRaw({
        tokenAddress: USDC_E_ADDRESS,
        owner: safeAddress,
      });

      const safeTxns = [allowanceSafeTxn];

      if (usdcEBalance > 0n) {
        safeTxns.push({
          to: COLLATERAL_ONRAMP_ADDRESS,
          data: encodeWrap({
            asset: USDC_E_ADDRESS,
            to: safeAddress,
            amount: usdcEBalance,
          }),
          operation: OperationType.Call,
          value: '0',
        });
      }

      const batchedTxn = aggregateTransaction(safeTxns);
      const callData = await getSafeTransactionCallData({
        signer,
        safeAddress,
        txn: batchedTxn,
      });

      await submitTransaction({
        to: safeAddress,
        data: callData,
        type: TransactionType.contractInteraction,
      });

      if (isMountedRef.current) {
        setStatus(
          usdcEBalance > 0n
            ? `Upgrade submitted — allowances + wrapping ${Number(usdcEBalance) / 1e6} USDC.e`
            : 'Upgrade submitted — allowances set (no USDC.e to wrap)',
        );
      }
      await refresh();
    } catch (upgradeError) {
      if (isMountedRef.current) {
        setStatus(
          `Upgrade failed: ${
            upgradeError instanceof Error
              ? upgradeError.message
              : 'Unknown error'
          }`,
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsUpgradeLoading(false);
      }
    }
  }, [address, refresh, signer, submitTransaction]);

  const handleDowngrade = useCallback(async () => {
    if (!signer || !address) {
      setStatus('Downgrade unavailable: missing signer');
      return;
    }

    const confirmed = await confirmAction(
      'Downgrade to v1',
      'This will revoke all v2 allowances. pUSD balance is kept (Offramp not yet operational).',
    );

    if (!confirmed) {
      return;
    }

    setIsDowngradeLoading(true);
    setStatus('Submitting downgrade transactions...');

    try {
      const safeAddress = computeProxyAddress(address);

      const safeTxns: {
        to: string;
        data: string;
        operation: OperationType;
        value: string;
      }[] = [];

      for (const spender of usdcESpenders) {
        safeTxns.push({
          to: USDC_E_ADDRESS,
          data: encodeApprove({ spender, amount: 0n }),
          operation: OperationType.Call,
          value: '0',
        });
      }

      for (const spender of [...pUsdSpenders, PERMIT2_ADDRESS]) {
        safeTxns.push({
          to: MATIC_CONTRACTS.collateral,
          data: encodeApprove({ spender, amount: 0n }),
          operation: OperationType.Call,
          value: '0',
        });
      }

      for (const spender of outcomeTokenSpenders) {
        safeTxns.push({
          to: MATIC_CONTRACTS.conditionalTokens,
          data: encodeErc1155Approve({ spender, approved: false }),
          operation: OperationType.Call,
          value: '0',
        });
      }

      const callData = await getSafeTransactionCallData({
        signer,
        safeAddress,
        txn: aggregateTransaction(safeTxns),
      });

      await submitTransaction({
        to: safeAddress,
        data: callData,
        type: TransactionType.contractInteraction,
      });

      if (isMountedRef.current) {
        setStatus('Downgrade submitted — v2 allowances revoked');
      }
      await refresh();
    } catch (downgradeError) {
      if (isMountedRef.current) {
        setStatus(
          `Downgrade failed: ${
            downgradeError instanceof Error
              ? downgradeError.message
              : 'Unknown error'
          }`,
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsDowngradeLoading(false);
      }
    }
  }, [address, refresh, signer, submitTransaction]);

  const statusColor = status.toLowerCase().includes('failed')
    ? TextColor.ErrorDefault
    : TextColor.SuccessDefault;
  const marketStatus = marketData?.status as PredictMarketStatus | undefined;

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      <Box twClassName="flex-row items-center gap-3 px-4 py-3 border-b border-default bg-default">
        <Pressable
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          }}
          style={({ pressed }) =>
            tw.style('rounded-full p-1', pressed && 'bg-muted')
          }
        >
          <Icon
            name={IconName.ArrowLeft}
            size={IconSize.Md}
            color={IconColor.IconDefault}
          />
        </Pressable>
        <Box twClassName="flex-1">
          <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
            CLOB v2 Playground
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextMuted}>
            Dev testing view for migration flows
          </Text>
        </Box>
      </Box>

      <ScrollView contentContainerStyle={tw.style('p-4 gap-4')}>
        <Section title="Account State">
          <InfoRow label="EOA" value={truncateAddress(address)} />
          <InfoRow
            label="Safe address"
            value={state?.safeAddress ?? '--'}
            valueColor={TextColor.TextDefault}
          />
          <InfoRow
            label="USDC.e balance"
            value={`${formatTokenBalance(state?.usdcEBalance)} USDC.e`}
          />
          <InfoRow
            label="pUSD balance"
            value={`${formatTokenBalance(state?.pUsdBalance)} pUSD`}
          />
          <InfoRow
            label="Deployment"
            value={state ? (state.isDeployed ? 'Yes' : 'No') : '--'}
            valueColor={
              state?.isDeployed ? TextColor.SuccessDefault : TextColor.TextMuted
            }
          />
          <InfoRow
            label="Allowances"
            value={
              state ? (state.hasAllowances ? '✅ Set' : '❌ Not set') : '--'
            }
            valueColor={
              state?.hasAllowances
                ? TextColor.SuccessDefault
                : TextColor.ErrorDefault
            }
          />

          {error ? (
            <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
              {error}
            </Text>
          ) : null}

          <Box twClassName="gap-2">
            <ActionButton
              label={loading ? 'Refreshing...' : 'Refresh'}
              onPress={() => {
                void handleRefresh();
              }}
              disabled={loading}
              variant="secondary"
            />
            {loading ? <ActivityIndicator /> : null}
          </Box>
        </Section>

        <Section title="Upgrade / Downgrade">
          <Text variant={TextVariant.BodySm} color={TextColor.TextMuted}>
            Upgrade sets v2 allowances and wraps USDC.e into pUSD. Downgrade
            revokes v2 approvals (unwrap not yet available).
          </Text>

          <Box twClassName="gap-3">
            <ActionButton
              label={isUpgradeLoading ? 'Upgrading...' : 'Upgrade to v2'}
              onPress={() => {
                void handleUpgrade();
              }}
              disabled={!address || isUpgradeLoading || isDowngradeLoading}
            />
            <ActionButton
              label={isDowngradeLoading ? 'Downgrading...' : 'Downgrade to v1'}
              onPress={() => {
                void handleDowngrade();
              }}
              disabled={!address || isUpgradeLoading || isDowngradeLoading}
              variant="secondary"
            />
          </Box>

          <Box twClassName="rounded-xl bg-muted p-3">
            <Text variant={TextVariant.BodySm} color={TextColor.TextMuted}>
              Last action
            </Text>
            <Text variant={TextVariant.BodyMd} color={statusColor}>
              {status}
            </Text>
          </Box>
        </Section>

        <Section title="Market Test">
          {isMarketLoading ? (
            <ActivityIndicator />
          ) : marketData ? (
            <Box twClassName="gap-3">
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                {marketData.title}
              </Text>

              {marketData.outcomes.slice(0, 10).map((outcome) => (
                <PredictMarketOutcome
                  key={outcome.id}
                  market={marketData}
                  outcome={outcome}
                />
              ))}

              <Text
                variant={TextVariant.HeadingSm}
                color={TextColor.TextDefault}
              >
                Positions
              </Text>

              {isPositionsLoading ? (
                <ActivityIndicator />
              ) : positions && positions.length > 0 ? (
                positions.map((position) => (
                  <PredictPositionDetail
                    key={position.id}
                    position={position}
                    market={marketData}
                    marketStatus={
                      (marketStatus ?? marketData.status) as PredictMarketStatus
                    }
                  />
                ))
              ) : (
                <Text variant={TextVariant.BodySm} color={TextColor.TextMuted}>
                  No positions for this market
                </Text>
              )}
            </Box>
          ) : (
            <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
              Failed to load market data
            </Text>
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ClobV2Playground;
