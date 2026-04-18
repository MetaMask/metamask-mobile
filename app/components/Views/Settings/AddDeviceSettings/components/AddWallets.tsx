import React, { useCallback, useState } from 'react';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  Checkbox,
  Button,
  AvatarAccount,
  AvatarAccountSize,
  AvatarGroup,
  AvatarAccountVariant,
  AvatarGroupVariant,
  AvatarGroupSize,
  BoxBackgroundColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { AddDeviceSettingsStep } from '../constant';
import { CaipChainId } from '@metamask/utils';
import { TouchableOpacity } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

interface AddWalletsProps {
  onAddWallets: (type: AddDeviceSettingsStep) => void;
}

const ETHEREUM_CAIP = 'eip155:1' as CaipChainId;
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

const STABLECOIN_AVATAR_PROPS = [
  {
    variant: AvatarAccountVariant.Jazzicon,
    address: USDC_ADDRESS,
  },
  {
    variant: AvatarAccountVariant.Jazzicon,
    address: ETHEREUM_CAIP,
  },
  {
    variant: AvatarAccountVariant.Jazzicon,
    address: DAI_ADDRESS,
  },
];

const WalletItem = ({
  isSelected,
  onChange,
}: {
  isSelected: boolean;
  onChange: () => void;
}) => {
  const tw = useTailwind();
  return (
    <TouchableOpacity
      style={tw.style(
        'flex-row gap-2 items-center justify-between p-4',
        isSelected ? 'bg-primary-muted' : 'bg-background-default',
      )}
      onPress={onChange}
    >
      <Box twClassName="flex-row flex-1 items-center gap-3">
        <Checkbox isSelected={isSelected} onChange={onChange} />
        <AvatarAccount
          shape="circle"
          address="0x1234567890123456789012345678901234567890"
          size={AvatarAccountSize.Md}
        />
        <Box twClassName="flex-col gap-1">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
          >
            Defi wallet
          </Text>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            0x34567...a3456
          </Text>
        </Box>
      </Box>
      <Box twClassName="flex-col items-end justify-end gap-1">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          $1,234.45
        </Text>
        <AvatarGroup
          size={AvatarGroupSize.Xs}
          max={1}
          variant={AvatarGroupVariant.Account}
          avatarPropsArr={STABLECOIN_AVATAR_PROPS}
        />
      </Box>
    </TouchableOpacity>
  );
};

const AddWallets = ({ onAddWallets }: AddWalletsProps) => {
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [wallets, setWallets] = useState([
    {
      isSelected: false,
      name: 'Defi wallet 1',
      address: '1',
    },
    {
      isSelected: false,
      name: 'Defi wallet 2',
      address: '2',
    },
    {
      isSelected: false,
      name: 'Defi wallet 3',
      address: '3',
    },
  ]);

  const handleSelectAll = () => {
    const newValue = !isSelectAll;
    setWallets(wallets.map((w) => ({ ...w, isSelected: newValue })));
    setIsSelectAll(newValue);
  };

  const handleSelectWallet = useCallback(
    (address: string) => {
      const updatedWallets = wallets.map((w) =>
        w.address === address ? { ...w, isSelected: !w.isSelected } : w,
      );
      setWallets(updatedWallets);
      setIsSelectAll(updatedWallets.every((w) => w.isSelected));
    },
    [wallets],
  );

  return (
    <Box twClassName="p-4 pt-0 px-0 flex-1 flex-col gap-4">
      <Box twClassName="flex-col gap-1 px-4">
        <Text
          variant={TextVariant.HeadingLg}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
        >
          Add Wallets
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('app_settings.add_device.add_wallets_desc')}
        </Text>
      </Box>
      <Box twClassName="flex-col gap-3">
        <Checkbox
          isSelected={isSelectAll}
          onChange={handleSelectAll}
          label={strings('app_settings.add_device.select_all')}
          twClassName="px-4"
        />
        <Box twClassName="flex-col">
          {wallets.map((wallet) => (
            <WalletItem
              key={wallet.address}
              isSelected={wallet.isSelected}
              onChange={() => handleSelectWallet(wallet.address)}
            />
          ))}
        </Box>
      </Box>
      <Box twClassName="w-full mt-auto px-4">
        <Button
          twClassName="w-full"
          onPress={() => onAddWallets(AddDeviceSettingsStep.SCAN_QR_CODE)}
        >
          {strings('app_settings.add_device.add_wallets')}
        </Button>
      </Box>
    </Box>
  );
};
export default AddWallets;
