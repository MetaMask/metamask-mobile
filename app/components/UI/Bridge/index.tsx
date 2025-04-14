import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import ScreenView from '../../Base/ScreenView';
import Keypad from '../../Base/Keypad';
import {
  TokenInputArea,
  TokenInputAreaType,
} from './components/TokenInputArea';
import Button, {
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import { Box } from '../Box/Box';
import { FlexDirection, JustifyContent, AlignItems } from '../Box/box.types';
import Text, {
  TextColor,
} from '../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { getNetworkImageSource } from '../../../util/networks';
import { useLatestBalance } from './hooks/useLatestBalance';
import {
  selectSourceAmount,
  selectSelectedDestChainId,
  setSourceAmount,
  resetBridgeState,
  setSourceToken,
  setDestToken,
  selectDestToken,
  selectSourceToken,
} from '../../../core/redux/slices/bridge';
import { ethers } from 'ethers';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getBridgeNavbar } from '../Navbar';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import useSubmitBridgeTx from '../../../util/bridge/hooks/useSubmitBridgeTx';
import { QuoteResponse } from './types';
import Engine from '../../../core/Engine';
import { Hex } from '@metamask/utils';
import Routes from '../../../constants/navigation/Routes';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import { QuoteMetadata } from '@metamask/bridge-controller';
import QuoteDetailsCard from './components/QuoteDetailsCard';
import { useBridgeQuoteRequest } from './hooks/useBridgeQuoteRequest';
import { useBridgeQuoteData } from './hooks/useBridgeQuoteData';
import { DummyQuoteMetadata } from '../../../../e2e/api-mocking/mock-responses/bridge-api-quotes';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    content: {
      flexGrow: 1,
    },
    screen: {
      flexGrow: 1,
    },
    inputsContainer: {
      paddingVertical: 12,
    },
    buttonContainer: {
      width: '100%',
    },
    button: {
      width: '100%',
    },
    bottomSection: {
      padding: 24,
    },
    arrowContainer: {
      position: 'relative',
      alignItems: 'center',
      height: 1,
      backgroundColor: theme.colors.border.muted,
    },
    arrowCircle: {
      position: 'absolute',
      top: -16,
      backgroundColor: theme.colors.background.alternative,
      width: 32,
      height: 32,
      borderRadius: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    arrow: {
      fontSize: 20,
      color: theme.colors.text.default,
      lineHeight: 20,
      height: 20,
      includeFontPadding: false,
      textAlignVertical: 'center',
      paddingTop: 1,
    },
    quoteContainer: {
      paddingHorizontal: 24,
      paddingVertical: 24,
    },
  });
};

// We get here through handleBridgeNavigation in AssetOverview and WalletActions
const BridgeView = () => {
  // The same as getUseExternalServices in Extension
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );

  const { styles } = useStyles(createStyles, {});
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const { submitBridgeTx } = useSubmitBridgeTx();

  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const destChainId = useSelector(selectSelectedDestChainId);
  const { activeQuote, isLoading, destTokenAmount } = useBridgeQuoteData();
  const updateQuoteParams = useBridgeQuoteRequest();

  const latestSourceBalance = useLatestBalance({
    address: sourceToken?.address,
    decimals: sourceToken?.decimals,
    chainId: sourceToken?.chainId as Hex,
    balance: sourceToken?.balance,
  });

  const hasInsufficientBalance = useMemo(() => {
    if (
      !sourceAmount ||
      !latestSourceBalance?.atomicBalance ||
      !sourceToken?.decimals
    ) {
      return false;
    }

    const sourceAmountAtomic = ethers.utils.parseUnits(
      sourceAmount,
      sourceToken.decimals,
    );
    return sourceAmountAtomic.gt(latestSourceBalance.atomicBalance);
  }, [sourceAmount, latestSourceBalance?.atomicBalance, sourceToken?.decimals]);

  // Reset bridge state when component unmounts
  useEffect(
    () => () => {
      dispatch(resetBridgeState());
    },
    [dispatch],
  );

  useEffect(() => {
    navigation.setOptions(getBridgeNavbar(navigation, route, colors));
  }, [navigation, route, colors]);

  // Update quote parameters when relevant state changes
  useEffect(() => {
    if (sourceToken?.chainId && destToken?.chainId && sourceAmount) {
      updateQuoteParams();
    }
    return () => {
      updateQuoteParams.cancel();
    };
  }, [
    sourceToken?.chainId,
    destToken?.chainId,
    sourceAmount,
    updateQuoteParams,
    dispatch,
  ]);

  useEffect(() => {
    const setBridgeFeatureFlags = async () => {
      try {
        if (isBasicFunctionalityEnabled) {
          await Engine.context.BridgeController.setBridgeFeatureFlags();
        }
      } catch (error) {
        console.error('Error setting bridge feature flags', error);
      }
    };

    setBridgeFeatureFlags();
  }, [isBasicFunctionalityEnabled]);

  const handleKeypadChange = ({
    value,
  }: {
    value: string;
    valueAsNumber: number;
    pressedKey: string;
  }) => {
    dispatch(setSourceAmount(value || undefined));
  };

  const handleContinue = async () => {
    // TODO: Implement bridge transaction with source and destination amounts
    // TESTING: Paste a quote from the Bridge API here to test the bridge flow
    const quoteResponse = {
      "quote": {
          "requestId": "224657dd-7002-46e2-b6e0-fccc598fd5ad",
          "srcChainId": 1,
          "srcTokenAmount": "9912500",
          "srcAsset": {
              "address": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
              "chainId": 1,
              "assetId": "eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7",
              "symbol": "USDT",
              "decimals": 6,
              "name": "Tether USD",
              "coingeckoId": "tether",
              "aggregators": [
                  "aave",
                  "coinGecko",
                  "openSwap",
                  "zerion",
                  "oneInch",
                  "liFi",
                  "xSwap",
                  "socket",
                  "rubic",
                  "squid",
                  "pmm",
                  "metamask",
                  "bancor"
              ],
              "occurrences": 13,
              "iconUrl": "https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xdac17f958d2ee523a2206206994597c13d831ec7.png",
              "metadata": {
                  "honeypotStatus": {
                      "honeypotIs": false,
                      "goPlus": false
                  },
                  "isContractVerified": true,
                  "fees": {
                      "avgFee": 0,
                      "maxFee": 0,
                      "minFee": 0
                  },
                  "storage": {
                      "balance": 2,
                      "approval": 5
                  },
                  "erc20Permit": false,
                  "description": {
                      "en": "Tether (USDT) is a cryptocurrency with a value meant to mirror the value of the U.S. dollar. The idea was to create a stable cryptocurrency that can be used like digital dollars. Coins that serve this purpose of being a stable dollar substitute are called “stable coins.” Tether is the most popular stable coin and even acts as a dollar replacement on many popular exchanges! According to their site, Tether converts cash into digital currency, to anchor or “tether” the value of the coin to the price of national currencies like the US dollar, the Euro, and the Yen. Like other cryptos it uses blockchain. Unlike other cryptos, it is [according to the official Tether site] “100% backed by USD” (USD is held in reserve). The primary use of Tether is that it offers some stability to the otherwise volatile crypto space and offers liquidity to exchanges who can’t deal in dollars and with banks (for example to the sometimes controversial but leading exchange <a href=\"https://www.coingecko.com/en/exchanges/bitfinex\">Bitfinex</a>).The digital coins are issued by a company called Tether Limited that is governed by the laws of the British Virgin Islands, according to the legal part of its website. It is incorporated in Hong Kong. It has emerged that Jan Ludovicus van der Velde is the CEO of cryptocurrency exchange Bitfinex, which has been accused of being involved in the price manipulation of bitcoin, as well as tether. Many people trading on exchanges, including Bitfinex, will use tether to buy other cryptocurrencies like bitcoin. Tether Limited argues that using this method to buy virtual currencies allows users to move fiat in and out of an exchange more quickly and cheaply. Also, exchanges typically have rocky relationships with banks, and using Tether is a way to circumvent that.USDT is fairly simple to use. Once on exchanges like <a href=\"https://www.coingecko.com/en/exchanges/poloniex\">Poloniex</a> or Bittrex, it can be used to purchase Bitcoin and other cryptocurrencies. It can be easily transferred from an exchange to any Omni Layer enabled wallet. Tether has no transaction fees, although external wallets and exchanges may charge one. In order to convert USDT to USD and vise versa through the Tether.to Platform, users must pay a small fee. Buying and selling Tether for Bitcoin can be done through a variety of exchanges like the ones mentioned previously or through the Tether.to platform, which also allows the conversion between USD to and from your bank account.",
                      "ko": "미국 달러화를 기반으로 한 블록체인1) 기반 암호화폐실제 달러화 유보금과 1:1정도의 비율을 유지함으로써 가치의 변동성이 거의 없다는 것이 특징가치 변동이 심한 다른 암호화폐 거래 시 안정적인 자산 운용을 위한 역할을 수행하고 있음가치암호화폐 거래를 위한 실질적 기축통화와 1:1 비율로 가치를 형성하는 거래 수단 및 극심한 변동성을 가지고 있는 다른 암호화폐를 거래하기 위한 실질적인 화폐의 기능을 수행할 수 있는 목적으로 만들어진 암호화폐 입니다.이러한 역할을 수행할 수 있는 화폐는 신뢰성을 바탕으로 운영과 관리가 되어야 하며 이를 운영사인 Tether사에서 은행에 1:1비율로 보유하고 있는 미국 달러를 토대로 투명하게 정기적으로 재무 상태를 공개하며 운영을 하는 정책을 가지고 있지만 실질적으로 2017년 들어 의혹이 생길 만한 일들이 다소 발생하였고 이로 인하여 신뢰도가 어느정도 하락한 상태입니다.하지만 아직까지는 USD를 기반으로 한 안정적인 가치의 유지는 지속되고 있으며 여전히 거래 시장 또한 활발하게 움직이고 있는 상황입니다."
                  },
                  "createdAt": "2023-10-31T22:41:58.553Z"
              },
              "price": "0.99974017"
          },
          "destChainId": 42161,
          "destTokenAmount": "9906163",
          "destAsset": {
              "address": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
              "chainId": 42161,
              "assetId": "eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831",
              "symbol": "USDC",
              "decimals": 6,
              "name": "USDC",
              "coingeckoId": "usd-coin",
              "aggregators": [
                  "coinGecko",
                  "traderJoe",
                  "oneInch",
                  "liFi",
                  "xSwap",
                  "socket",
                  "rubic",
                  "squid"
              ],
              "occurrences": 8,
              "iconUrl": "https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/42161/erc20/0xaf88d065e77c8cc2239327c5edb3a432268e5831.png",
              "metadata": {
                  "honeypotStatus": {},
                  "isContractVerified": true,
                  "storage": {
                      "balance": 9,
                      "approval": 10
                  },
                  "erc20Permit": true,
                  "description": {
                      "en": "USDC is a fully collateralized US dollar stablecoin. USDC is the bridge between dollars and trading on cryptocurrency exchanges. The technology behind CENTRE makes it possible to exchange value between people, businesses and financial institutions just like email between mail services and texts between SMS providers. We believe by removing artificial economic borders, we can create a more inclusive global economy."
                  },
                  "createdAt": "2023-10-31T21:35:04.606Z"
              },
              "price": "0.99995"
          },
          "feeData": {
              "metabridge": {
                  "amount": "87500",
                  "asset": {
                      "address": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                      "chainId": 1,
                      "assetId": "eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7",
                      "symbol": "USDT",
                      "decimals": 6,
                      "name": "Tether USD",
                      "coingeckoId": "tether",
                      "aggregators": [
                          "aave",
                          "coinGecko",
                          "openSwap",
                          "zerion",
                          "oneInch",
                          "liFi",
                          "xSwap",
                          "socket",
                          "rubic",
                          "squid",
                          "pmm",
                          "metamask",
                          "bancor"
                      ],
                      "occurrences": 13,
                      "iconUrl": "https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xdac17f958d2ee523a2206206994597c13d831ec7.png",
                      "metadata": {
                          "honeypotStatus": {
                              "honeypotIs": false,
                              "goPlus": false
                          },
                          "isContractVerified": true,
                          "fees": {
                              "avgFee": 0,
                              "maxFee": 0,
                              "minFee": 0
                          },
                          "storage": {
                              "balance": 2,
                              "approval": 5
                          },
                          "erc20Permit": false,
                          "description": {
                              "en": "Tether (USDT) is a cryptocurrency with a value meant to mirror the value of the U.S. dollar. The idea was to create a stable cryptocurrency that can be used like digital dollars. Coins that serve this purpose of being a stable dollar substitute are called “stable coins.” Tether is the most popular stable coin and even acts as a dollar replacement on many popular exchanges! According to their site, Tether converts cash into digital currency, to anchor or “tether” the value of the coin to the price of national currencies like the US dollar, the Euro, and the Yen. Like other cryptos it uses blockchain. Unlike other cryptos, it is [according to the official Tether site] “100% backed by USD” (USD is held in reserve). The primary use of Tether is that it offers some stability to the otherwise volatile crypto space and offers liquidity to exchanges who can’t deal in dollars and with banks (for example to the sometimes controversial but leading exchange <a href=\"https://www.coingecko.com/en/exchanges/bitfinex\">Bitfinex</a>).The digital coins are issued by a company called Tether Limited that is governed by the laws of the British Virgin Islands, according to the legal part of its website. It is incorporated in Hong Kong. It has emerged that Jan Ludovicus van der Velde is the CEO of cryptocurrency exchange Bitfinex, which has been accused of being involved in the price manipulation of bitcoin, as well as tether. Many people trading on exchanges, including Bitfinex, will use tether to buy other cryptocurrencies like bitcoin. Tether Limited argues that using this method to buy virtual currencies allows users to move fiat in and out of an exchange more quickly and cheaply. Also, exchanges typically have rocky relationships with banks, and using Tether is a way to circumvent that.USDT is fairly simple to use. Once on exchanges like <a href=\"https://www.coingecko.com/en/exchanges/poloniex\">Poloniex</a> or Bittrex, it can be used to purchase Bitcoin and other cryptocurrencies. It can be easily transferred from an exchange to any Omni Layer enabled wallet. Tether has no transaction fees, although external wallets and exchanges may charge one. In order to convert USDT to USD and vise versa through the Tether.to Platform, users must pay a small fee. Buying and selling Tether for Bitcoin can be done through a variety of exchanges like the ones mentioned previously or through the Tether.to platform, which also allows the conversion between USD to and from your bank account.",
                              "ko": "미국 달러화를 기반으로 한 블록체인1) 기반 암호화폐실제 달러화 유보금과 1:1정도의 비율을 유지함으로써 가치의 변동성이 거의 없다는 것이 특징가치 변동이 심한 다른 암호화폐 거래 시 안정적인 자산 운용을 위한 역할을 수행하고 있음가치암호화폐 거래를 위한 실질적 기축통화와 1:1 비율로 가치를 형성하는 거래 수단 및 극심한 변동성을 가지고 있는 다른 암호화폐를 거래하기 위한 실질적인 화폐의 기능을 수행할 수 있는 목적으로 만들어진 암호화폐 입니다.이러한 역할을 수행할 수 있는 화폐는 신뢰성을 바탕으로 운영과 관리가 되어야 하며 이를 운영사인 Tether사에서 은행에 1:1비율로 보유하고 있는 미국 달러를 토대로 투명하게 정기적으로 재무 상태를 공개하며 운영을 하는 정책을 가지고 있지만 실질적으로 2017년 들어 의혹이 생길 만한 일들이 다소 발생하였고 이로 인하여 신뢰도가 어느정도 하락한 상태입니다.하지만 아직까지는 USD를 기반으로 한 안정적인 가치의 유지는 지속되고 있으며 여전히 거래 시장 또한 활발하게 움직이고 있는 상황입니다."
                          },
                          "createdAt": "2023-10-31T22:41:58.553Z"
                      },
                      "price": "0.99974017"
                  }
              }
          },
          "bridgeId": "lifi",
          "bridges": [
              "across"
          ],
          "steps": [
              {
                  "action": "swap",
                  "srcChainId": 1,
                  "destChainId": 1,
                  "protocol": {
                      "name": "1inch",
                      "displayName": "1inch",
                      "icon": "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/exchanges/oneinch.png"
                  },
                  "srcAsset": {
                      "address": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                      "chainId": 1,
                      "assetId": "eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7",
                      "symbol": "USDT",
                      "decimals": 6,
                      "name": "Tether USD",
                      "coingeckoId": "tether",
                      "aggregators": [
                          "aave",
                          "coinGecko",
                          "openSwap",
                          "zerion",
                          "oneInch",
                          "liFi",
                          "xSwap",
                          "socket",
                          "rubic",
                          "squid",
                          "pmm",
                          "metamask",
                          "bancor"
                      ],
                      "occurrences": 13,
                      "iconUrl": "https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xdac17f958d2ee523a2206206994597c13d831ec7.png",
                      "metadata": {
                          "honeypotStatus": {
                              "honeypotIs": false,
                              "goPlus": false
                          },
                          "isContractVerified": true,
                          "fees": {
                              "avgFee": 0,
                              "maxFee": 0,
                              "minFee": 0
                          },
                          "storage": {
                              "balance": 2,
                              "approval": 5
                          },
                          "erc20Permit": false,
                          "description": {
                              "en": "Tether (USDT) is a cryptocurrency with a value meant to mirror the value of the U.S. dollar. The idea was to create a stable cryptocurrency that can be used like digital dollars. Coins that serve this purpose of being a stable dollar substitute are called “stable coins.” Tether is the most popular stable coin and even acts as a dollar replacement on many popular exchanges! According to their site, Tether converts cash into digital currency, to anchor or “tether” the value of the coin to the price of national currencies like the US dollar, the Euro, and the Yen. Like other cryptos it uses blockchain. Unlike other cryptos, it is [according to the official Tether site] “100% backed by USD” (USD is held in reserve). The primary use of Tether is that it offers some stability to the otherwise volatile crypto space and offers liquidity to exchanges who can’t deal in dollars and with banks (for example to the sometimes controversial but leading exchange <a href=\"https://www.coingecko.com/en/exchanges/bitfinex\">Bitfinex</a>).The digital coins are issued by a company called Tether Limited that is governed by the laws of the British Virgin Islands, according to the legal part of its website. It is incorporated in Hong Kong. It has emerged that Jan Ludovicus van der Velde is the CEO of cryptocurrency exchange Bitfinex, which has been accused of being involved in the price manipulation of bitcoin, as well as tether. Many people trading on exchanges, including Bitfinex, will use tether to buy other cryptocurrencies like bitcoin. Tether Limited argues that using this method to buy virtual currencies allows users to move fiat in and out of an exchange more quickly and cheaply. Also, exchanges typically have rocky relationships with banks, and using Tether is a way to circumvent that.USDT is fairly simple to use. Once on exchanges like <a href=\"https://www.coingecko.com/en/exchanges/poloniex\">Poloniex</a> or Bittrex, it can be used to purchase Bitcoin and other cryptocurrencies. It can be easily transferred from an exchange to any Omni Layer enabled wallet. Tether has no transaction fees, although external wallets and exchanges may charge one. In order to convert USDT to USD and vise versa through the Tether.to Platform, users must pay a small fee. Buying and selling Tether for Bitcoin can be done through a variety of exchanges like the ones mentioned previously or through the Tether.to platform, which also allows the conversion between USD to and from your bank account.",
                              "ko": "미국 달러화를 기반으로 한 블록체인1) 기반 암호화폐실제 달러화 유보금과 1:1정도의 비율을 유지함으로써 가치의 변동성이 거의 없다는 것이 특징가치 변동이 심한 다른 암호화폐 거래 시 안정적인 자산 운용을 위한 역할을 수행하고 있음가치암호화폐 거래를 위한 실질적 기축통화와 1:1 비율로 가치를 형성하는 거래 수단 및 극심한 변동성을 가지고 있는 다른 암호화폐를 거래하기 위한 실질적인 화폐의 기능을 수행할 수 있는 목적으로 만들어진 암호화폐 입니다.이러한 역할을 수행할 수 있는 화폐는 신뢰성을 바탕으로 운영과 관리가 되어야 하며 이를 운영사인 Tether사에서 은행에 1:1비율로 보유하고 있는 미국 달러를 토대로 투명하게 정기적으로 재무 상태를 공개하며 운영을 하는 정책을 가지고 있지만 실질적으로 2017년 들어 의혹이 생길 만한 일들이 다소 발생하였고 이로 인하여 신뢰도가 어느정도 하락한 상태입니다.하지만 아직까지는 USD를 기반으로 한 안정적인 가치의 유지는 지속되고 있으며 여전히 거래 시장 또한 활발하게 움직이고 있는 상황입니다."
                          },
                          "createdAt": "2023-10-31T22:41:58.553Z"
                      }
                  },
                  "destAsset": {
                      "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                      "chainId": 1,
                      "assetId": "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                      "symbol": "USDC",
                      "decimals": 6,
                      "name": "USD Coin",
                      "coingeckoId": "usd-coin",
                      "aggregators": [
                          "aave",
                          "coinGecko",
                          "coinMarketCap",
                          "openSwap",
                          "zerion",
                          "oneInch",
                          "liFi",
                          "xSwap",
                          "socket",
                          "rubic",
                          "squid",
                          "pmm",
                          "metamask",
                          "bancor"
                      ],
                      "occurrences": 14,
                      "iconUrl": "https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
                      "metadata": {
                          "honeypotStatus": {
                              "honeypotIs": false
                          },
                          "isContractVerified": true,
                          "fees": {
                              "avgFee": 0,
                              "maxFee": 0,
                              "minFee": 0
                          },
                          "storage": {
                              "balance": 9,
                              "approval": 10
                          },
                          "erc20Permit": true,
                          "description": {
                              "en": "USDC is a fully collateralized US dollar stablecoin. USDC is the bridge between dollars and trading on cryptocurrency exchanges. The technology behind CENTRE makes it possible to exchange value between people, businesses and financial institutions just like email between mail services and texts between SMS providers. We believe by removing artificial economic borders, we can create a more inclusive global economy."
                          },
                          "createdAt": "2023-10-31T22:41:58.553Z"
                      }
                  },
                  "srcAmount": "9912500",
                  "destAmount": "9910279"
              },
              {
                  "action": "bridge",
                  "srcChainId": 1,
                  "destChainId": 42161,
                  "protocol": {
                      "name": "across",
                      "displayName": "AcrossV3",
                      "icon": "https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/acrossv2.png"
                  },
                  "srcAsset": {
                      "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                      "chainId": 1,
                      "assetId": "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                      "symbol": "USDC",
                      "decimals": 6,
                      "name": "USD Coin",
                      "coingeckoId": "usd-coin",
                      "aggregators": [
                          "aave",
                          "coinGecko",
                          "coinMarketCap",
                          "openSwap",
                          "zerion",
                          "oneInch",
                          "liFi",
                          "xSwap",
                          "socket",
                          "rubic",
                          "squid",
                          "pmm",
                          "metamask",
                          "bancor"
                      ],
                      "occurrences": 14,
                      "iconUrl": "https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
                      "metadata": {
                          "honeypotStatus": {
                              "honeypotIs": false
                          },
                          "isContractVerified": true,
                          "fees": {
                              "avgFee": 0,
                              "maxFee": 0,
                              "minFee": 0
                          },
                          "storage": {
                              "balance": 9,
                              "approval": 10
                          },
                          "erc20Permit": true,
                          "description": {
                              "en": "USDC is a fully collateralized US dollar stablecoin. USDC is the bridge between dollars and trading on cryptocurrency exchanges. The technology behind CENTRE makes it possible to exchange value between people, businesses and financial institutions just like email between mail services and texts between SMS providers. We believe by removing artificial economic borders, we can create a more inclusive global economy."
                          },
                          "createdAt": "2023-10-31T22:41:58.553Z"
                      }
                  },
                  "destAsset": {
                      "address": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                      "chainId": 42161,
                      "assetId": "eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831",
                      "symbol": "USDC",
                      "decimals": 6,
                      "name": "USDC",
                      "coingeckoId": "usd-coin",
                      "aggregators": [
                          "coinGecko",
                          "traderJoe",
                          "oneInch",
                          "liFi",
                          "xSwap",
                          "socket",
                          "rubic",
                          "squid"
                      ],
                      "occurrences": 8,
                      "iconUrl": "https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/42161/erc20/0xaf88d065e77c8cc2239327c5edb3a432268e5831.png",
                      "metadata": {
                          "honeypotStatus": {},
                          "isContractVerified": true,
                          "storage": {
                              "balance": 9,
                              "approval": 10
                          },
                          "erc20Permit": true,
                          "description": {
                              "en": "USDC is a fully collateralized US dollar stablecoin. USDC is the bridge between dollars and trading on cryptocurrency exchanges. The technology behind CENTRE makes it possible to exchange value between people, businesses and financial institutions just like email between mail services and texts between SMS providers. We believe by removing artificial economic borders, we can create a more inclusive global economy."
                          },
                          "createdAt": "2023-10-31T21:35:04.606Z"
                      }
                  },
                  "srcAmount": "9910279",
                  "destAmount": "9906163"
              }
          ],
          "bridgePriceData": {
              "totalFromAmountUsd": "9.9099",
              "totalToAmountUsd": "9.9057",
              "priceImpact": "0.0004238186056368752"
          }
      },
      "approval": {
          "chainId": 1,
          "to": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
          "from": "0x43b0FAc6d66B3ab9cDc5eE491733c16aCc624132",
          "value": "0x00",
          "data": "0x095ea7b30000000000000000000000000439e60f02a8900a951603950d8d4527f400c3f10000000000000000000000000000000000000000000000000000000000989680",
          "gasLimit": 48924
      },
      "trade": {
          "chainId": 1,
          "to": "0x0439e60F02a8900a951603950d8D4527f400C3f1",
          "from": "0x43b0FAc6d66B3ab9cDc5eE491733c16aCc624132",
          "value": "0x00",
          "data": "0x3ce33bff0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000000000000000000000000000000000000098968000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000d6c6966694164617074657256320000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006c00000000000000000000000001231deb6f5749ef6ce6943a275a1d3e7486f4eae0000000000000000000000001231deb6f5749ef6ce6943a275a1d3e7486f4eae000000000000000000000000000000000000000000000000000000000000a4b1000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e583100000000000000000000000000000000000000000000000000000000009740b4000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000155cc000000000000000000000000e6b738da243e8fa2a0ed5915645789add5de5152000000000000000000000000000000000000000000000000000000000000056428832cbd000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000002200000000000000000000000000000000000000000000000000000000000000400a90734c89b1b6b6c2ecb37514f79f5f329da496b16db84469076c325bc6e8a02000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000043b0fac6d66b3ab9cdc5ee491733c16acc6241320000000000000000000000000000000000000000000000000000000000967678000000000000000000000000000000000000000000000000000000000000a4b10000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000066163726f73730000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f6d6574616d61736b2d627269646765000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000111111125421ca6dc452d289314280a0f8842a65000000000000000000000000111111125421ca6dc452d289314280a0f8842a65000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000009740b400000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000008883800a8e000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec700000000000000000000000000000000000000000000000000000000009740b400000000000000000000000000000000000000000000000000000000009676772800000000000000000000003416cf6c708da44db2624d63ea0aaef7113527c62a94d11400000000000000000000000000000000000000000000000000000000000000000000000043b0fac6d66b3ab9cdc5ee491733c16acc62413200000000000000000000000043b0fac6d66b3ab9cdc5ee491733c16acc624132000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e583100000000000000000000000000000000000000000000000000000000009666680000000000000000000000000000000000000000000000000ddf3b5749bc4f1400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000067fd53eb0000000000000000000000000000000000000000000000000000000067fd77e7000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007c4362a10148a222c00b1f660e8e272e5dad0e596b4c69ef7d95d70fce1e14233c1a2274c1c7b1e62e99ec7cfdd972a4abb9cbab59bcbe095f9a40781e8ff7301c",
          "gasLimit": 446843
      },
      "estimatedProcessingTimeInSeconds": 48
  };
    // TESTING: Paste quote metadata from extension here to test the bridge flow
    const quoteMetadata = DummyQuoteMetadata;
    if (Object.keys(quoteResponse).length > 0 && Object.keys(quoteMetadata).length > 0) {
      await submitBridgeTx({ quoteResponse: {...quoteResponse, ...quoteMetadata} as QuoteResponse & QuoteMetadata });
      navigation.navigate(Routes.TRANSACTIONS_VIEW);
    }
  };

  const handleTermsPress = () => {
    // TODO: Implement terms and conditions navigation
  };

  const handleArrowPress = () => {
    // Switch tokens
    if (sourceToken && destToken) {
      dispatch(setSourceToken(destToken));
      dispatch(setDestToken(sourceToken));
    }
  };

  const handleSourceTokenPress = () =>
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SOURCE_TOKEN_SELECTOR,
      params: {},
    });

  const handleDestTokenPress = () =>
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR,
      params: {},
    });

  const renderBottomContent = () => {
    if (
      !sourceAmount ||
      (sourceToken?.decimals &&
        ethers.utils.parseUnits(sourceAmount, sourceToken.decimals).isZero())
    ) {
      return <Text color={TextColor.Alternative}>Select amount</Text>;
    }

    if (hasInsufficientBalance) {
      return <Text color={TextColor.Error}>Insufficient balance</Text>;
    }

    return (
      <>
        <Button
          variant={ButtonVariants.Primary}
          label={strings('bridge.continue')}
          onPress={handleContinue}
          style={styles.button}
        />
        <Button
          variant={ButtonVariants.Link}
          label={
            <Text color={TextColor.Alternative}>
              {strings('bridge.terms_and_conditions')}
            </Text>
          }
          onPress={handleTermsPress}
        />
      </>
    );
  };

  return (
    // Need this to be full height of screen
    // @ts-expect-error The type is incorrect, this will work
    <ScreenView contentContainerStyle={styles.screen}>
      <Box
        style={styles.content}
        flexDirection={FlexDirection.Column}
        justifyContent={JustifyContent.spaceBetween}
      >
        <Box style={styles.inputsContainer} gap={8}>
          <TokenInputArea
            amount={sourceAmount}
            token={sourceToken}
            tokenBalance={latestSourceBalance?.displayBalance}
            //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
            networkImageSource={getNetworkImageSource({
              chainId: sourceToken?.chainId as Hex,
            })}
            autoFocus
            isReadonly
            testID="source-token-area"
            tokenType={TokenInputAreaType.Source}
            onTokenPress={handleSourceTokenPress}
          />
          <Box style={styles.arrowContainer}>
            <Box style={styles.arrowCircle}>
              <ButtonIcon
                iconName={IconName.Arrow2Down}
                onPress={handleArrowPress}
                disabled={!destChainId || !destToken}
                testID="arrow-button"
              />
            </Box>
          </Box>
          <TokenInputArea
            amount={destTokenAmount}
            token={destToken}
            networkImageSource={
              destToken
                ? //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
                  getNetworkImageSource({ chainId: destToken?.chainId as Hex })
                : undefined
            }
            isReadonly
            testID="dest-token-area"
            tokenType={TokenInputAreaType.Destination}
            onTokenPress={handleDestTokenPress}
            isLoading={isLoading}
          />
          <Box style={styles.quoteContainer}>
            {activeQuote && !isLoading && <QuoteDetailsCard />}
          </Box>
        </Box>

        <Box style={styles.bottomSection}>
          <Keypad
            value={sourceAmount}
            onChange={handleKeypadChange}
            currency={sourceToken?.symbol || 'ETH'}
            decimals={sourceToken?.decimals || 18}
            deleteIcon={<Icon name={IconName.ArrowLeft} size={IconSize.Lg} />}
          />
          <Box
            style={styles.buttonContainer}
            flexDirection={FlexDirection.Column}
            justifyContent={JustifyContent.center}
            alignItems={AlignItems.center}
            gap={12}
          >
            {renderBottomContent()}
          </Box>
        </Box>
      </Box>
    </ScreenView>
  );
};

export default BridgeView;
