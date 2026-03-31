import React from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import HardwareWalletTestIds from '../../hardwareWallet.testIds';

import type { AccountSelectionItem } from './types';
import SelectionCheckbox from './SelectionCheckbox';
import AccountAssetRow from './AccountAssetRow';

const AccountCard = ({
  account,
  onPress,
}: {
  account: AccountSelectionItem;
  onPress: () => void;
}) => {
  const tw = useTailwind();

  return (
    <Pressable
      testID={`${HardwareWalletTestIds.ACCOUNT_CARD}-${account.index}`}
      accessibilityRole="checkbox"
      accessibilityState={{
        checked: account.isSelected,
        disabled: account.isExistingAccount,
      }}
      disabled={account.isExistingAccount}
      onPress={onPress}
    >
      {({ pressed }) => (
        <Box
          twClassName="rounded-xl border bg-muted px-4 py-3"
          style={tw.style(
            pressed && !account.isExistingAccount && 'opacity-90',
          )}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
          >
            <Box twClassName="flex-1 pr-3">
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {`Account ${account.index + 1}`}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {account.totalBalance}
              </Text>
            </Box>
            <SelectionCheckbox
              isSelected={account.isSelected}
              isDisabled={account.isExistingAccount}
            />
          </Box>

          <Box twClassName="mt-3 border-t border-muted pt-3">
            <Box twClassName="gap-3">
              {account.assets.map((asset) => (
                <AccountAssetRow
                  key={`${account.index}-${asset.title}-${asset.address}-${asset.label ?? 'base'}`}
                  asset={asset}
                />
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </Pressable>
  );
};

export default AccountCard;
