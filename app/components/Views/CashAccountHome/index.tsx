import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { TransactionMeta } from '@metamask/transaction-controller';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { selectTokens } from '../../../selectors/tokensController';
import { selectContractBalances } from '../../../selectors/tokenBalancesController';
import { selectSortedEVMTransactionsForSelectedAccountGroup } from '../../../selectors/transactionController';
import { renderFromTokenMinimalUnit, renderFromWei } from '../../../util/number';
import { useTheme } from '../../../util/theme';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';

const shortenAddress = (address: string) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

const formatTxAmount = (tx: TransactionMeta, selectedAddress: string): string => {
  const value = tx.txParams?.value;
  if (!value || value === '0x0' || value === '0x00') return '';
  try {
    const eth = renderFromWei(value);
    const isOutgoing = tx.txParams?.from?.toLowerCase() === selectedAddress.toLowerCase();
    return `${isOutgoing ? '-' : '+'}${eth} ETH`;
  } catch {
    return '';
  }
};

const getTxTitle = (tx: TransactionMeta, selectedAddress: string): string => {
  const isOutgoing = tx.txParams?.from?.toLowerCase() === selectedAddress.toLowerCase();
  if (tx.type === 'simpleSend' || tx.type === 'transfer') {
    return isOutgoing ? 'Sent' : 'Received';
  }
  if (tx.type === 'contractInteraction') return 'Contract interaction';
  if (tx.type === 'swap') return 'Swap';
  return isOutgoing ? 'Sent' : 'Received';
};

const getTxSubtitle = (tx: TransactionMeta, selectedAddress: string): string => {
  const isOutgoing = tx.txParams?.from?.toLowerCase() === selectedAddress.toLowerCase();
  const counterparty = isOutgoing ? tx.txParams?.to : tx.txParams?.from;
  if (!counterparty) return '';
  return `${isOutgoing ? 'To' : 'From'}: ${shortenAddress(counterparty)}`;
};

const CashAccountHome = () => {
  const { colors } = useTheme();
  const tokens = useSelector(selectTokens);
  const contractBalances = useSelector(selectContractBalances);
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const allTransactions = useSelector(selectSortedEVMTransactionsForSelectedAccountGroup);

  const usdcToken = useMemo(
    () => tokens.find((t) => t.symbol === 'USDC'),
    [tokens],
  );

  const usdcBalance = useMemo(() => {
    if (!usdcToken) return '0.00';
    const hexBalance =
      contractBalances[usdcToken.address as keyof typeof contractBalances] ??
      '0x0';
    return renderFromTokenMinimalUnit(hexBalance, usdcToken.decimals, 2);
  }, [usdcToken, contractBalances]);

  const recentTransactions = useMemo(() => {
    if (!selectedAccount?.address) return [];
    const address = selectedAccount.address.toLowerCase();
    return allTransactions
      .filter(
        (tx) =>
          tx.txParams?.from?.toLowerCase() === address ||
          tx.txParams?.to?.toLowerCase() === address,
      )
      .slice(0, 2);
  }, [allTransactions, selectedAccount]);

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Overflow menu */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.overflowButton} hitSlop={8}>
          <Icon
            name={IconName.MoreVertical}
            size={IconSize.Md}
            color={colors.icon.default}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance header */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Cash balance</Text>
          <Text style={styles.balanceAmount}>${usdcBalance}</Text>
        </View>

        {/* Quick action buttons */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionItem} activeOpacity={0.7}>
            <View style={styles.quickActionIconWrap}>
              <Icon name={IconName.Add} size={IconSize.Md} color={colors.text.default} />
            </View>
            <Text style={styles.quickActionLabel}>Add</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionItem} activeOpacity={0.7}>
            <View style={styles.quickActionIconWrap}>
              <Icon name={IconName.SwapHorizontal} size={IconSize.Md} color={colors.text.default} />
            </View>
            <Text style={styles.quickActionLabel}>Transfer</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionItem} activeOpacity={0.7}>
            <View style={styles.quickActionIconWrap}>
              <Icon name={IconName.Card} size={IconSize.Md} color={colors.text.default} />
            </View>
            <Text style={styles.quickActionLabel}>Card</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Earnings section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionHeader} activeOpacity={0.7}>
            <Text style={styles.sectionTitle}>Earnings</Text>
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Md}
              color={colors.icon.default}
            />
          </TouchableOpacity>

          <View style={styles.listRow}>
            <View style={styles.listRowLeft}>
              <Text style={styles.listRowLabel}>APY</Text>
              <Icon
                name={IconName.Info}
                size={IconSize.Sm}
                color={colors.icon.alternative}
                style={styles.infoIcon}
              />
            </View>
            <Text style={styles.listRowValueSuccess}>—</Text>
          </View>

          <View style={styles.listRow}>
            <Text style={styles.listRowLabel}>Lifetime earnings</Text>
            <Text style={styles.listRowValue}>$—</Text>
          </View>

          <View style={[styles.listRow, styles.listRowLast]}>
            <Text style={styles.listRowLabel}>Pending earnings</Text>
            <Text style={styles.listRowValue}>$—</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Card section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionHeader} activeOpacity={0.7}>
            <Text style={styles.sectionTitle}>Card</Text>
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Md}
              color={colors.icon.default}
            />
          </TouchableOpacity>

          <View style={styles.cardRow}>
            <View style={styles.cardImagePlaceholder} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardNumber}>•••• 1234</Text>
              <Text style={styles.cardSubtitle}>Virtual card</Text>
            </View>
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Sm}
              label="Add funds"
              onPress={() => undefined}
            />
          </View>
        </View>

        <View style={styles.divider} />

        {/* Activity section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionHeader} activeOpacity={0.7}>
            <Text style={styles.sectionTitle}>Activity</Text>
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Md}
              color={colors.icon.default}
            />
          </TouchableOpacity>

          {recentTransactions.length === 0 ? (
            <View style={styles.activityEmpty}>
              <Text style={styles.activityEmptyText}>No recent activity</Text>
            </View>
          ) : (
            recentTransactions.map((tx, index) => {
              const address = selectedAccount?.address ?? '';
              const isOutgoing = tx.txParams?.from?.toLowerCase() === address.toLowerCase();
              const amount = formatTxAmount(tx, address);
              const title = getTxTitle(tx, address);
              const subtitle = getTxSubtitle(tx, address);
              const isLast = index === recentTransactions.length - 1;

              return (
                <View
                  key={tx.id}
                  style={[styles.activityRow, isLast && styles.listRowLast]}
                >
                  <View style={styles.activityAvatar}>
                    <Icon
                      name={isOutgoing ? IconName.Arrow2UpRight : IconName.ArrowCircleDown}
                      size={IconSize.Md}
                      color={colors.icon.alternative}
                    />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>{title}</Text>
                    {subtitle ? (
                      <Text style={styles.activitySubtitle}>{subtitle}</Text>
                    ) : null}
                  </View>
                  {amount ? (
                    <View style={styles.activityAmountWrap}>
                      <Text
                        style={isOutgoing ? styles.activityAmountOut : styles.activityAmountIn}
                      >
                        {amount}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View style={styles.bottomCTA}>
        <TouchableOpacity
          style={[styles.ctaButton, styles.ctaButtonPrimary]}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaButtonPrimaryText}>Add money</Text>
        </TouchableOpacity>
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Lg}
          label="Move money"
          onPress={() => undefined}
          style={styles.ctaButton}
        />
      </View>
    </SafeAreaView>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = (colors: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    topBar: {
      alignItems: 'flex-end',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
    overflowButton: {
      padding: 8,
    },
    container: {
      flex: 1,
    },
    content: {
      paddingBottom: 16,
    },
    balanceSection: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 24,
    },
    balanceLabel: {
      fontSize: 24,
      fontWeight: '600',
      color: colors.text.default,
      marginBottom: 4,
    },
    balanceAmount: {
      fontSize: 40,
      fontWeight: '600',
      color: colors.text.default,
      lineHeight: 50,
    },
    quickActions: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingBottom: 24,
      gap: 8,
    },
    quickActionItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.background.alternative,
      gap: 6,
    },
    quickActionIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.background.default,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickActionLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.text.default,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border.muted,
      marginBottom: 20,
    },
    section: {
      paddingHorizontal: 16,
      marginBottom: 4,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text.default,
    },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.muted,
    },
    listRowLast: {
      borderBottomWidth: 0,
    },
    listRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    listRowLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text.default,
    },
    infoIcon: {
      marginLeft: 4,
    },
    listRowValue: {
      fontSize: 14,
      color: colors.text.default,
    },
    listRowValueSuccess: {
      fontSize: 14,
      color: colors.success.default,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      gap: 16,
    },
    cardImagePlaceholder: {
      width: 104,
      height: 66,
      borderRadius: 8,
      backgroundColor: colors.background.alternative,
    },
    cardInfo: {
      flex: 1,
    },
    cardNumber: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text.default,
      marginBottom: 4,
    },
    cardSubtitle: {
      fontSize: 14,
      color: colors.text.alternative,
    },
    activityEmpty: {
      paddingVertical: 24,
      alignItems: 'center',
    },
    activityEmptyText: {
      fontSize: 14,
      color: colors.text.alternative,
    },
    activityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.muted,
    },
    activityAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.background.alternative,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activityInfo: {
      flex: 1,
    },
    activityTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text.default,
    },
    activitySubtitle: {
      fontSize: 13,
      color: colors.text.alternative,
      marginTop: 2,
    },
    activityAmountWrap: {
      alignItems: 'flex-end',
    },
    activityAmountIn: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.success.default,
    },
    activityAmountOut: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.default,
    },
    bottomCTA: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
      backgroundColor: colors.background.default,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border.muted,
    },
    ctaButton: {
      flex: 1,
    },
    ctaButtonPrimary: {
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.success.default,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaButtonPrimaryText: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.success.inverse,
    },
  });

export default CashAccountHome;
