import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import {
    Box,
    Text,
    TextVariant,
    FontWeight,
    TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import Avatar, {
    AvatarSize,
    AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import { AvatarAccountType } from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';

interface RecipientType {
    accountGroupName: string;
    address: string;
    id: string;
    isSelected?: boolean;
}

interface RecipientProps {
    recipient: RecipientType;
    accountAvatarType: AvatarAccountType;
    onPress?: (recipient: RecipientType) => void;
}

export function Recipient({ recipient, accountAvatarType, onPress }: RecipientProps) {
    const tw = useTailwind();

    const handlePress = useCallback(() => {
        onPress?.(recipient);
    }, [recipient, onPress]);

    // Generate temporary fiat values based on account name for demo
    const generateTempFiatValue = (accountName: string) => {
        const values = ['$2,400.00', '$51.32', '$1,234.56', '$789.00', '$3,456.78'];
        const index = accountName.length % values.length;
        return values[index];
    };

    return (
        <Pressable
            style={({ pressed }) =>
                tw.style(
                    'w-full flex-row items-center justify-between py-2 px-4',
                    pressed || recipient.isSelected ? 'bg-pressed' : 'bg-transparent',
                )
            }
            onPress={handlePress}
        >
            {/* Left side: Avatar + Name */}
            <Box twClassName="flex-row items-center">
                <Box twClassName="h-12 justify-center">
                    <Avatar
                        variant={AvatarVariant.Account}
                        type={accountAvatarType}
                        accountAddress={recipient.address}
                        size={AvatarSize.Md}
                    />
                </Box>

                <Box twClassName="ml-4 h-12 justify-center">
                    <Text
                        variant={TextVariant.BodyMd}
                        fontWeight={FontWeight.Medium}
                        numberOfLines={1}
                    >
                        {recipient.accountGroupName}
                    </Text>
                </Box>
            </Box>

            {/* Right side: Balance */}
            <Box twClassName="h-12 justify-center items-end">
                <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Regular}
                    numberOfLines={1}
                >
                    {generateTempFiatValue(recipient.accountGroupName)}
                </Text>
            </Box>
        </Pressable>
    );
}
