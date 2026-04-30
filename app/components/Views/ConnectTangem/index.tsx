import React, { useCallback, useState } from 'react';
import { Alert, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, StackActions } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  Button,
  ButtonVariant,
  ButtonSize,
  Icon,
  IconName,
  IconSize,
  TextVariant,
  TextColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import TitleStandard from '../../../component-library/components-temp/TitleStandard';
import {
  scanTangemCard,
  getTangemAccountsByOperation,
  unlockTangemWalletAccount,
} from '../../../core/Tangem';
import PAGINATION_OPERATIONS from '../../../constants/pagination';
import { ConnectTangemSelectorsIDs } from './ConnectTangem.testIds';

interface AccountEntry {
  address: string;
  balance: string;
  index: number;
}

const ConnectTangem = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const [isScanning, setIsScanning] = useState(false);
  const [accounts, setAccounts] = useState<AccountEntry[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(
    new Set(),
  );
  const [cardScanned, setCardScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScanCard = useCallback(async () => {
    setIsScanning(true);
    setError(null);
    try {
      await scanTangemCard();
      setCardScanned(true);
      const firstPage = await getTangemAccountsByOperation(
        PAGINATION_OPERATIONS.GET_FIRST_PAGE,
      );
      setAccounts(firstPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to scan Tangem card');
    } finally {
      setIsScanning(false);
    }
  }, []);

  const toggleAccountSelection = useCallback((index: number) => {
    setSelectedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    try {
      for (const index of selectedIndexes) {
        await unlockTangemWalletAccount(index);
      }
      navigation.dispatch(StackActions.pop(2));
    } catch (e) {
      Alert.alert(
        'Error',
        e instanceof Error ? e.message : 'Failed to add accounts',
      );
    }
  }, [selectedIndexes, navigation]);

  const renderAccountItem = useCallback(
    ({ item }: { item: AccountEntry }) => {
      const isSelected = selectedIndexes.has(item.index);
      return (
        <TouchableOpacity
          testID={`${ConnectTangemSelectorsIDs.ACCOUNT_ITEM}-${item.index}`}
          onPress={() => toggleAccountSelection(item.index)}
          style={tw.style(
            'flex-row items-center justify-between px-4 py-3 border-b border-border-muted',
            isSelected && 'bg-primary-muted',
          )}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={3}
          >
            <Box twClassName="w-8 h-8 rounded-full bg-muted items-center justify-center">
              <Text variant={TextVariant.BodySm}>{item.index + 1}</Text>
            </Box>
            <Box>
              <Text variant={TextVariant.BodyMd}>
                {`${item.address.slice(0, 6)}...${item.address.slice(-4)}`}
              </Text>
              <Text variant={TextVariant.BodySm} color={TextColor.Alternative}>
                {`Index ${item.index}`}
              </Text>
            </Box>
          </Box>
          {isSelected && <Icon name={IconName.Check} size={IconSize.Md} />}
        </TouchableOpacity>
      );
    },
    [selectedIndexes, toggleAccountSelection, tw],
  );

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderCompactStandard includesTopInset onBack={navigation.goBack} />
      <TitleStandard
        title="Connect Tangem Card"
        bottomAccessory={
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            twClassName="mt-1"
          >
            {cardScanned
              ? 'Select the accounts you want to import'
              : 'Tap your Tangem card to your phone to get started'}
          </Text>
        }
        twClassName="px-4 pt-1 pb-3"
      />

      <Box
        testID={ConnectTangemSelectorsIDs.CONTAINER}
        twClassName="flex-1 px-4"
      >
        {!cardScanned ? (
          <Box
            twClassName="flex-1"
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            gap={6}
          >
            <Box twClassName="w-24 h-24 rounded-full bg-muted items-center justify-center">
              <Icon name={IconName.Scan} size={IconSize.Xl} />
            </Box>

            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.Alternative}
              twClassName="text-center px-8"
            >
              Make sure NFC is enabled on your device and hold your Tangem card
              against the back of your phone.
            </Text>

            {error && (
              <Text
                testID={ConnectTangemSelectorsIDs.ERROR_MESSAGE}
                variant={TextVariant.BodySm}
                color={TextColor.Error}
                twClassName="text-center"
              >
                {error}
              </Text>
            )}

            <Button
              testID={ConnectTangemSelectorsIDs.SCAN_BUTTON}
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              onPress={handleScanCard}
              isDisabled={isScanning}
              isFullWidth
            >
              {isScanning ? 'Scanning...' : 'Scan Card'}
            </Button>
          </Box>
        ) : (
          <Box twClassName="flex-1">
            <FlatList
              testID={ConnectTangemSelectorsIDs.ACCOUNT_LIST}
              data={accounts}
              renderItem={renderAccountItem}
              keyExtractor={(item) => `tangem-account-${item.index}`}
              twClassName="flex-1 rounded-lg border border-border-muted"
            />

            <Box twClassName="py-4" gap={3}>
              <Button
                testID={ConnectTangemSelectorsIDs.CONFIRM_BUTTON}
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                onPress={handleConfirm}
                isDisabled={selectedIndexes.size === 0}
                isFullWidth
              >
                {`Import ${selectedIndexes.size} Account${selectedIndexes.size !== 1 ? 's' : ''}`}
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </SafeAreaView>
  );
};

export default ConnectTangem;
