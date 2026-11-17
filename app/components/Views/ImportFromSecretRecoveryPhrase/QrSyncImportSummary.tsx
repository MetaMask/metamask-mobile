import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import {
  AvatarAccount,
  AvatarAccountSize,
  AvatarAccountVariant,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonBase,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';

import I18n, { strings } from '../../../../locales/i18n';
import { formatWithThreshold } from '../../../util/assets';
import type { QrSyncImportSummary as QrSyncImportSummaryData } from '../../../selectors/qrSyncController';
import { ImportFromSeedSelectorsIDs } from './ImportFromSeed.testIds';

const DEMO_ACCOUNT_BALANCES = [
  94857.55, 12500.25, 0, 4832.11, 250, 0, 1299.95, 45.8, 0, 312.42, 8720, 0,
  31.05, 650.34, 0, 20000, 95.12, 0, 741.8, 18.49,
];

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 16 },
});

interface QrSyncImportSummaryProps {
  summary: QrSyncImportSummaryData;
}

const getWalletTitle = (
  wallet: QrSyncImportSummaryData['wallets'][number],
  walletIndex: number,
) => {
  const name =
    wallet.name ??
    strings('app_settings.add_device.import_summary.wallet_fallback', {
      count: walletIndex + 1,
    });

  return wallet.accounts.length === 1
    ? strings('app_settings.add_device.import_summary.wallet_one_account', {
        name,
      })
    : strings('app_settings.add_device.import_summary.wallet_accounts', {
        name,
        count: wallet.accounts.length,
      });
};

const QrSyncImportSummary = ({ summary }: QrSyncImportSummaryProps) => {
  const [collapsedWallets, setCollapsedWallets] = useState<Set<string>>(
    () => new Set(),
  );
  const toggleWallet = useCallback((walletId: string) => {
    setCollapsedWallets((previousWallets) => {
      const nextWallets = new Set(previousWallets);
      if (nextWallets.has(walletId)) {
        nextWallets.delete(walletId);
      } else {
        nextWallets.add(walletId);
      }
      return nextWallets;
    });
  }, []);

  const title =
    summary.accountCount === 1
      ? strings('app_settings.add_device.import_summary.one_account_title')
      : strings('app_settings.add_device.import_summary.accounts_title', {
          count: summary.accountCount,
        });
  const description =
    summary.walletCount === 1
      ? strings('app_settings.add_device.import_summary.one_wallet_description')
      : strings('app_settings.add_device.import_summary.wallets_description', {
          count: summary.walletCount,
        });

  return (
    <Box
      twClassName="min-h-0 flex-1 gap-6 pt-3"
      testID={ImportFromSeedSelectorsIDs.QR_SYNC_SUMMARY_ID}
    >
      <TitleStandard
        title={title}
        bottomAccessory={
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {description}
          </Text>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        testID={ImportFromSeedSelectorsIDs.QR_SYNC_SUMMARY_LIST_ID}
      >
        <Box gap={6}>
          {summary.wallets.map((wallet, walletIndex) => {
            const isExpanded = !collapsedWallets.has(wallet.id);
            const walletTitle = getWalletTitle(wallet, walletIndex);

            return (
              <Box key={wallet.id} gap={3}>
                <ButtonBase
                  accessibilityLabel={walletTitle}
                  accessibilityState={{ expanded: isExpanded }}
                  contentWrapperProps={{ twClassName: 'w-full' }}
                  isFullWidth
                  onPress={() => toggleWallet(wallet.id)}
                  testID={`${ImportFromSeedSelectorsIDs.QR_SYNC_SUMMARY_WALLET_ID}-${walletIndex}`}
                  twClassName="h-auto rounded-none bg-transparent p-0"
                >
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    justifyContent={BoxJustifyContent.Between}
                    twClassName="w-full py-2"
                  >
                    <Text
                      variant={TextVariant.HeadingSm}
                      fontWeight={FontWeight.Medium}
                      color={TextColor.TextAlternative}
                    >
                      {walletTitle}
                    </Text>
                    <Icon
                      name={isExpanded ? IconName.ArrowUp : IconName.ArrowDown}
                      color={IconColor.IconAlternative}
                    />
                  </Box>
                </ButtonBase>

                {isExpanded ? (
                  <Box>
                    {wallet.accounts.map((account, accountIndex) => (
                      <Box
                        key={account.id}
                        flexDirection={BoxFlexDirection.Row}
                        alignItems={BoxAlignItems.Center}
                        justifyContent={BoxJustifyContent.Between}
                        twClassName="py-4"
                        testID={`${ImportFromSeedSelectorsIDs.QR_SYNC_SUMMARY_ACCOUNT_ID}-${walletIndex}-${accountIndex}`}
                      >
                        <Box
                          flexDirection={BoxFlexDirection.Row}
                          alignItems={BoxAlignItems.Center}
                          gap={4}
                          twClassName="min-w-0 flex-1"
                        >
                          <AvatarAccount
                            address={account.id}
                            variant={AvatarAccountVariant.Maskicon}
                            size={AvatarAccountSize.Md}
                          />
                          <Text
                            variant={TextVariant.BodyMd}
                            fontWeight={FontWeight.Medium}
                            color={TextColor.TextDefault}
                            numberOfLines={1}
                            twClassName="min-w-0 flex-1"
                          >
                            {account.name ??
                              strings(
                                'app_settings.add_device.import_summary.account_fallback',
                                { count: accountIndex + 1 },
                              )}
                          </Text>
                        </Box>
                        <Text
                          variant={TextVariant.BodyMd}
                          fontWeight={FontWeight.Medium}
                          color={TextColor.TextDefault}
                          twClassName="ml-4"
                        >
                          {formatWithThreshold(
                            DEMO_ACCOUNT_BALANCES[
                              walletIndex * 10 + accountIndex
                            ] ?? 0,
                            0.01,
                            I18n.locale,
                            {
                              style: 'currency',
                              currency: 'USD',
                            },
                          )}
                        </Text>
                      </Box>
                    ))}
                  </Box>
                ) : null}
              </Box>
            );
          })}
        </Box>
      </ScrollView>
    </Box>
  );
};

export default QrSyncImportSummary;
