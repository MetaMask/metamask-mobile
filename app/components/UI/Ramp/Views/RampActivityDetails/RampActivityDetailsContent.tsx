import React, { useCallback, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  HeaderStandard,
  SectionDivider,
} from '@metamask/design-system-react-native';
import { getProviderName } from '../../../../../reducers/fiatOrders';
import type { FiatOrder } from '../../../../../reducers/fiatOrders/types';
import {
  ActivityDetailsBlockExplorerButton,
  ActivityDetailsFooter,
} from '../../../../Views/ActivityDetails/components/ActivityDetailsFooter';
import { RampActivityDetailsHero } from './RampActivityDetailsHero';
import { RampActivityDetailsRows } from './RampActivityDetailsRows';
import {
  formatRampActivityDate,
  formatRampActivityFiatAmount,
  formatRampActivityFiatTotal,
  getRampActivityExplorerChainId,
  getRampActivityTitle,
  getRampActivityTransactionHash,
} from './RampActivityDetails.utils';

export function RampActivityDetailsContent({ order }: { order: FiatOrder }) {
  const tw = useTailwind();
  const navigation = useNavigation();
  const transactionHash = getRampActivityTransactionHash(order);
  const chainId = getRampActivityExplorerChainId(order.network);
  const providerName = getProviderName(order.provider, order.data);

  const formattedDate = useMemo(
    () => formatRampActivityDate(order.createdAt),
    [order.createdAt],
  );

  const transactionFee =
    formatRampActivityFiatAmount(order.fee, order.currency) ??
    formatRampActivityFiatAmount(order.cryptoFee, order.currency);
  const fiatValue = formatRampActivityFiatAmount(order.amount, order.currency);
  const totalReceived = formatRampActivityFiatTotal(
    order.amount,
    order.fee,
    order.currency,
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
    >
      <Box twClassName="flex-1 bg-default">
        <HeaderStandard
          title={getRampActivityTitle(order)}
          onBack={handleBack}
          includesTopInset
        />
        <ScrollView
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('grow p-4')}
        >
          <Box twClassName="flex-1">
            <RampActivityDetailsHero order={order} />
            <SectionDivider marginVertical={3} />
            <RampActivityDetailsRows
              chainId={chainId}
              fiatValue={fiatValue}
              formattedDate={formattedDate}
              order={order}
              providerName={providerName}
              totalReceived={totalReceived}
              transactionFee={transactionFee}
              transactionHash={transactionHash}
            />

            <Box twClassName="mt-auto pt-4">
              <ActivityDetailsFooter>
                <ActivityDetailsBlockExplorerButton
                  chainId={chainId}
                  hash={transactionHash}
                />
              </ActivityDetailsFooter>
            </Box>
          </Box>
        </ScrollView>
      </Box>
    </SafeAreaView>
  );
}
