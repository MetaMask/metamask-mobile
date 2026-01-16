// Third party dependencies
import React from 'react';
import { Pressable } from 'react-native-gesture-handler';
import { ScrollView } from 'react-native-gesture-handler';

// Internal dependencies
import {
  AvatarAccount,
  AvatarAccountVariant,
  AvatarBaseShape,
  AvatarToken,
  AvatarTokenSize,
  BadgeCount,
  BadgeWrapper,
  BadgeNetwork,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxFlexWrap,
  BoxJustifyContent,
  Button,
  ButtonBase,
  ButtonIcon,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconName,
  IconColor,
  Text,
  TextButton,
  TextColor,
  TextVariant,
  BadgeWrapperPosition,
  BadgeStatus,
  BadgeStatusStatus,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

const WalletHome: React.FC = () => {
  const tw = useTailwind();

  return (
    <ScrollView style={tw`flex-1 bg-default`}>
      {/* Container */}
      <Box twClassName="w-full bg-default py-4">
        {/* Header */}
        <Box twClassName="border-b border-muted p-4">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="flex-1 overflow-hidden"
            >
              <AvatarAccount
                shape={AvatarBaseShape.Square}
                variant={AvatarAccountVariant.Maskicon}
                address="0x1234567890123456789012345678901234567890"
              />
              <Box twClassName="ml-2 flex-1">
                <Text variant={TextVariant.HeadingMd} numberOfLines={1}>
                  DeFi Account
                </Text>
              </Box>
              <ButtonIcon
                iconName={IconName.ArrowDown}
                accessibilityLabel="Switch Account"
              />
            </Box>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="ml-2"
            >
              <ButtonIcon iconName={IconName.Copy} accessibilityLabel="Copy" />
              <ButtonIcon
                iconName={IconName.Global}
                accessibilityLabel="Network"
              />
              <BadgeWrapper
                badge={<BadgeCount count={10} max={9} />}
                position={BadgeWrapperPosition.TopRight}
              >
                <ButtonIcon
                  iconName={IconName.Menu}
                  accessibilityLabel="Menu"
                />
              </BadgeWrapper>
            </Box>
          </Box>
        </Box>

        {/* Balance */}
        <Box twClassName="p-4">
          <Text variant={TextVariant.DisplayMd}>$10,528.46</Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
          >
            <Icon name={IconName.Arrow2Up} color={IconColor.SuccessDefault} />
            <Text color={TextColor.TextAlternative}>$367.00 (+0.66%)</Text>
          </Box>
        </Box>

        {/* Actions */}
        <Box flexDirection={BoxFlexDirection.Row} gap={3} twClassName="p-4">
          <ButtonBase twClassName="h-20 flex-1 rounded-lg bg-muted px-0 py-4">
            <Box
              flexDirection={BoxFlexDirection.Column}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
            >
              <Icon name={IconName.Bank} />
              <Text fontWeight={FontWeight.Medium}>Buy/Sell</Text>
            </Box>
          </ButtonBase>
          <ButtonBase twClassName="h-20 flex-1 rounded-lg bg-muted px-0 py-4">
            <Box
              flexDirection={BoxFlexDirection.Column}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
            >
              <Icon name={IconName.SwapHorizontal} />
              <Text fontWeight={FontWeight.Medium}>Swap</Text>
            </Box>
          </ButtonBase>
          <ButtonBase twClassName="h-20 flex-1 rounded-lg bg-muted px-0 py-4">
            <Box
              flexDirection={BoxFlexDirection.Column}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
            >
              <Icon name={IconName.Receive} />
              <Text fontWeight={FontWeight.Medium}>Receive</Text>
            </Box>
          </ButtonBase>
          <ButtonBase twClassName="h-20 flex-1 rounded-lg bg-muted px-0 py-4">
            <Box
              flexDirection={BoxFlexDirection.Column}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
            >
              <Icon name={IconName.Send} />
              <Text fontWeight={FontWeight.Medium}>Send</Text>
            </Box>
          </ButtonBase>
        </Box>

        {/* Tabs */}
        <Box twClassName="border-b border-muted px-4">
          <Box flexDirection={BoxFlexDirection.Row}>
            <Pressable
              style={tw`flex-1 items-center justify-center border-b-2 border-default pb-2 pt-1`}
            >
              <Text fontWeight={FontWeight.Medium}>Tokens</Text>
            </Pressable>
            <Pressable
              style={tw`flex-1 flex-row items-center justify-center pb-2 pt-1`}
            >
              <Text
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                DeFi
              </Text>
              <Box twClassName="ml-1">
                <BadgeStatus status={BadgeStatusStatus.New} />
              </Box>
            </Pressable>
            <Pressable style={tw`flex-1 items-center justify-center pb-2 pt-1`}>
              <Text
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                NFTs
              </Text>
            </Pressable>
            <Pressable style={tw`flex-1 items-center justify-center pb-2 pt-1`}>
              <Text
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                Activity
              </Text>
            </Pressable>
          </Box>
        </Box>

        {/* Token List */}
        <Box>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="p-4"
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
            >
              <Button
                size={ButtonSize.Sm}
                variant={ButtonVariant.Secondary}
                endIconName={IconName.ArrowDown}
              >
                Popular networks
              </Button>
            </Box>
            <Box flexDirection={BoxFlexDirection.Row} gap={2}>
              <ButtonIcon
                iconName={IconName.Filter}
                accessibilityLabel="Filter"
              />
              <ButtonIcon
                iconName={IconName.MoreVertical}
                accessibilityLabel="More"
              />
            </Box>
          </Box>

          {/* Ethereum */}
          <Pressable
            style={({ pressed }) =>
              tw.style(
                'w-full flex-row items-center justify-between px-4 py-2',
                pressed && 'bg-pressed',
              )
            }
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="flex-1 overflow-hidden"
            >
              <BadgeWrapper
                badge={
                  <BadgeNetwork
                    name="Ethereum"
                    src={{
                      uri: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
                    }}
                  />
                }
              >
                <AvatarToken
                  name="ETH"
                  src={{
                    uri: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
                  }}
                  size={AvatarTokenSize.Md}
                />
              </BadgeWrapper>
              <Box
                flexDirection={BoxFlexDirection.Column}
                twClassName="ml-4 flex-1 overflow-hidden"
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  flexWrap={BoxFlexWrap.Wrap}
                  alignItems={BoxAlignItems.Center}
                >
                  <Text
                    fontWeight={FontWeight.Medium}
                    numberOfLines={1}
                    twClassName="mr-2"
                  >
                    Ethereum •
                  </Text>
                  <TextButton>Earn</TextButton>
                </Box>
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                >
                  <Icon
                    name={IconName.Arrow2Up}
                    color={IconColor.SuccessDefault}
                    size={IconSize.Sm}
                  />
                  <Text
                    color={TextColor.TextAlternative}
                    variant={TextVariant.BodySm}
                  >
                    +85.88%
                  </Text>
                </Box>
              </Box>
            </Box>
            <Box twClassName="items-end">
              <Text>$8,509.44</Text>
              <Text
                color={TextColor.TextAlternative}
                variant={TextVariant.BodySm}
              >
                0.7107 ETH
              </Text>
            </Box>
          </Pressable>

          {/* Unibright */}
          <Pressable
            style={({ pressed }) =>
              tw.style(
                'w-full flex-row items-center justify-between px-4 py-2',
                pressed && 'bg-pressed',
              )
            }
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="flex-1 overflow-hidden"
            >
              <BadgeWrapper
                badge={
                  <BadgeNetwork
                    name="Ethereum"
                    src={{
                      uri: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
                    }}
                  />
                }
              >
                <AvatarToken
                  name="UBT"
                  src={{
                    uri: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2758.png',
                  }}
                  size={AvatarTokenSize.Md}
                />
              </BadgeWrapper>
              <Box
                flexDirection={BoxFlexDirection.Column}
                twClassName="ml-4 flex-1 overflow-hidden"
              >
                <Text fontWeight={FontWeight.Medium} numberOfLines={1}>
                  Unibright
                </Text>
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                >
                  <Icon
                    name={IconName.Arrow2Up}
                    color={IconColor.SuccessDefault}
                    size={IconSize.Sm}
                  />
                  <Text
                    color={TextColor.TextAlternative}
                    variant={TextVariant.BodySm}
                  >
                    +85.88%
                  </Text>
                </Box>
              </Box>
            </Box>
            <Box twClassName="items-end">
              <Text>$1,293.50</Text>
              <Text
                color={TextColor.TextAlternative}
                variant={TextVariant.BodySm}
              >
                0.058 UBT
              </Text>
            </Box>
          </Pressable>

          {/* Hopr */}
          <Pressable
            style={({ pressed }) =>
              tw.style(
                'w-full flex-row items-center justify-between px-4 py-2',
                pressed && 'bg-pressed',
              )
            }
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="flex-1 overflow-hidden"
            >
              <BadgeWrapper
                badge={
                  <BadgeNetwork
                    name="Ethereum"
                    src={{
                      uri: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
                    }}
                  />
                }
              >
                <AvatarToken
                  name="HOPR"
                  src={{
                    uri: 'https://s2.coinmarketcap.com/static/img/coins/64x64/6520.png',
                  }}
                  size={AvatarTokenSize.Md}
                />
              </BadgeWrapper>
              <Box
                flexDirection={BoxFlexDirection.Column}
                twClassName="ml-4 flex-1 overflow-hidden"
              >
                <Text fontWeight={FontWeight.Medium} numberOfLines={1}>
                  Hopr
                </Text>
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                >
                  <Icon
                    name={IconName.Arrow2Up}
                    color={IconColor.SuccessDefault}
                    size={IconSize.Sm}
                  />
                  <Text
                    color={TextColor.TextAlternative}
                    variant={TextVariant.BodySm}
                  >
                    +85.88%
                  </Text>
                </Box>
              </Box>
            </Box>
            <Box twClassName="items-end">
              <Text>$550.00</Text>
              <Text
                color={TextColor.TextAlternative}
                variant={TextVariant.BodySm}
              >
                12.44 HOPR
              </Text>
            </Box>
          </Pressable>

          {/* USDC */}
          <Pressable
            style={({ pressed }) =>
              tw.style(
                'w-full flex-row items-center justify-between px-4 py-2',
                pressed && 'bg-pressed',
              )
            }
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="flex-1 overflow-hidden"
            >
              <BadgeWrapper
                badge={
                  <BadgeNetwork
                    name="Ethereum"
                    src={{
                      uri: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
                    }}
                  />
                }
              >
                <AvatarToken
                  name="USDC"
                  src={{
                    uri: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
                  }}
                  size={AvatarTokenSize.Md}
                />
              </BadgeWrapper>
              <Box
                flexDirection={BoxFlexDirection.Column}
                twClassName="ml-4 flex-1 overflow-hidden"
              >
                <Text fontWeight={FontWeight.Medium} numberOfLines={1}>
                  USDC Coin
                </Text>
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                >
                  <Icon
                    name={IconName.Arrow2Down}
                    color={IconColor.ErrorDefault}
                    size={IconSize.Sm}
                  />
                  <Text
                    color={TextColor.TextAlternative}
                    variant={TextVariant.BodySm}
                  >
                    -7.80%
                  </Text>
                </Box>
              </Box>
            </Box>
            <Box twClassName="items-end">
              <Text>$110.20</Text>
              <Text
                color={TextColor.TextAlternative}
                variant={TextVariant.BodySm}
              >
                0.7107 USDC
              </Text>
            </Box>
          </Pressable>
        </Box>
      </Box>
    </ScrollView>
  );
};

const DesignSystemMeta = {
  title: 'Design System / Wallet Home Example',
  component: WalletHome,
};

export default DesignSystemMeta;

export const WalletHomeExample = {
  render: () => <WalletHome />,
};
