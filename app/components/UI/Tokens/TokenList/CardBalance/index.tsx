import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { ethers } from 'ethers';
import { Hex } from '@metamask/utils';
import { useTheme } from '../../../../../util/theme';
import Engine from '../../../../../core/Engine';
import { renderFromTokenMinimalUnit } from '../../../../../util/number';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import { getGlobalChainId } from '../../../../../util/networks/global-network';
import { LINEA_CHAIN_ID } from '../PortfolioBalance/card.utils';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Card from '../../../../../component-library/components/Cards/Card';
import Icon, {
  IconSize,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import createStyles from '../../styles';
import Loader from '../../../../../component-library/components-temp/Loader/Loader';
import { RootState } from '../../../../../reducers';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';

// Supported token addresses on Linea
const USDC_ADDRESS = '0x176211869cA2b568f2A7D4EE941E073a821EE1ff';
const USDT_ADDRESS = '0xA219439258ca9da29E9Cc4cE5596924745e12B93';
const WETH_ADDRESS = '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f';

// Token decimals
const USDC_DECIMALS = 6;
const USDT_DECIMALS = 6;
const WETH_DECIMALS = 18;

// ERC20 Token ABI for balance checking
const erc20Abi = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

interface TokenBalance {
  address: string;
  symbol: string;
  name: string;
  balance: string;
  rawBalance: ethers.BigNumber;
  isLoading: boolean;
}

const CardBalance = () => {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    backButton: {
      padding: 8,
    },
    title: {
      fontWeight: 'bold',
      textAlign: 'center',
      flex: 1,
    },
    balanceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    privacyIcon: {
      marginLeft: 8,
    },
    tokenList: {
      marginTop: 16,
    },
    tokenItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.muted,
    },
    tokenInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    tokenDetails: {
      marginLeft: 12,
    },
    tokenSymbol: {
      fontWeight: 'bold',
    },
    tokenName: {
      color: colors.text.muted,
    },
    loaderWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonContainer: {
      marginTop: 24,
    }
  });
  const navigation = useNavigation();
  const selectedAddress = "0xFe4F94B62C04627C2677bF46FB249321594d0d79";
//   const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
  const { NetworkController } = Engine.context;
  const privacyMode = useSelector(selectPrivacyMode);
  const { PreferencesController } = Engine.context;
  
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalFiatBalance, setTotalFiatBalance] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalances = async () => {
      if (!selectedAddress) {
        setIsLoading(false);
        return;
      }

      try {
        const networkId = getGlobalChainId(NetworkController);
        
        // Only show balances on Linea network
        if (networkId !== LINEA_CHAIN_ID) {
          setIsLoading(false);
          return;
        }

        // Create provider
        let provider: ethers.providers.JsonRpcProvider;
        const infuraKey = process.env.INFURA_API_KEY;
        
        if (infuraKey) {
          provider = new ethers.providers.JsonRpcProvider(`https://linea-mainnet.infura.io/v3/${infuraKey}`);
        } else {
          // Fallback to a public RPC if no API key is available
          provider = new ethers.providers.JsonRpcProvider('https://linea-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161');
        }

        // Initialize token contracts
        const usdcContract = new ethers.Contract(USDC_ADDRESS, erc20Abi, provider);
        const usdtContract = new ethers.Contract(USDT_ADDRESS, erc20Abi, provider);
        const wethContract = new ethers.Contract(WETH_ADDRESS, erc20Abi, provider);

        // Get token symbols and names
        const [usdcSymbol, usdcName, usdtSymbol, usdtName, wethSymbol, wethName] = await Promise.all([
          usdcContract.symbol().catch(() => 'USDC'),
          usdcContract.name().catch(() => 'USD Coin'),
          usdtContract.symbol().catch(() => 'USDT'),
          usdtContract.name().catch(() => 'Tether USD'),
          wethContract.symbol().catch(() => 'WETH'),
          wethContract.name().catch(() => 'Wrapped Ether')
        ]);

        // Fetch user token balances
        const [usdcBalance, usdtBalance, wethBalance] = await Promise.all([
          usdcContract.balanceOf(selectedAddress).catch(() => ethers.BigNumber.from(0)),
          usdtContract.balanceOf(selectedAddress).catch(() => ethers.BigNumber.from(0)),
          wethContract.balanceOf(selectedAddress).catch(() => ethers.BigNumber.from(0))
        ]);

        // Set token balances
        const balances: TokenBalance[] = [
          {
            address: USDC_ADDRESS,
            symbol: usdcSymbol,
            name: usdcName,
            balance: renderFromTokenMinimalUnit(usdcBalance.toString(), USDC_DECIMALS),
            rawBalance: usdcBalance,
            isLoading: false
          },
          {
            address: USDT_ADDRESS,
            symbol: usdtSymbol,
            name: usdtName,
            balance: renderFromTokenMinimalUnit(usdtBalance.toString(), USDT_DECIMALS),
            rawBalance: usdtBalance,
            isLoading: false
          },
          {
            address: WETH_ADDRESS,
            symbol: wethSymbol,
            name: wethName,
            balance: renderFromTokenMinimalUnit(wethBalance.toString(), WETH_DECIMALS),
            rawBalance: wethBalance,
            isLoading: false
          }
        ];

        setTokenBalances(balances);
        
        // Calculate total balance by summing USDT and USDC balances (excluding WETH)
        const totalRawBalance = balances.reduce((total, token) => {
          // Only add USDC and USDT to the total
          if (token.address === USDC_ADDRESS || token.address === USDT_ADDRESS) {
            return total.add(token.rawBalance);
          }
          return total;
        }, ethers.BigNumber.from(0));
        
        const hasNonZeroBalance = !totalRawBalance.isZero();
        
        // Format the total balance as a string for display with $ and 2 decimal places
        let totalBalanceDisplay = 'No tokens available';
        if (hasNonZeroBalance) {
          // Convert to a decimal number with proper decimal places
          const totalInDecimal = parseFloat(renderFromTokenMinimalUnit(totalRawBalance.toString(), USDC_DECIMALS));
          // Format with $ and 2 decimal places
          totalBalanceDisplay = `$${totalInDecimal.toFixed(2)}`;
        }
        
        setTotalFiatBalance(totalBalanceDisplay);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching token balances:', error);
        setIsLoading(false);
      }
    };

    fetchBalances();
  }, [selectedAddress, NetworkController]);

  const goBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const toggleIsBalanceAndAssetsHidden = useCallback(
    (value: boolean) => {
      PreferencesController.setPrivacyMode(value);
    },
    [PreferencesController],
  );

  const renderTokenItem = (token: TokenBalance) => {
    return (
      <View key={token.address} style={styles.tokenItem}>
        <View style={styles.tokenInfo}>
          <Icon 
            name={IconName.Coin} 
            size={IconSize.Md} 
            color={colors.icon.default} 
          />
          <View style={styles.tokenDetails}>
            <Text variant={TextVariant.BodyMD} style={styles.tokenSymbol}>
              {token.symbol}
            </Text>
            <Text variant={TextVariant.BodySM} style={styles.tokenName}>
              {token.name}
            </Text>
          </View>
        </View>
        <View>
          <SensitiveText
            isHidden={privacyMode}
            length={SensitiveTextLength.Medium}
            variant={TextVariant.BodyMD}
          >
            {token.balance}
          </SensitiveText>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBack} testID="card-balance-back-button">
            <Icon name={IconName.ArrowLeft} size={IconSize.Md} color={colors.icon.default} />
          </TouchableOpacity>
          <Text variant={TextVariant.HeadingMD} style={styles.title}>
            {strings('asset_overview.token_balances')}
          </Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loaderWrapper}>
          <Loader />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack} testID="card-balance-back-button">
          <Icon name={IconName.ArrowLeft} size={IconSize.Md} color={colors.icon.default} />
        </TouchableOpacity>
        <Text variant={TextVariant.HeadingMD} style={styles.title}>
          {strings('asset_overview.token_balances')}
        </Text>
        <View style={styles.backButton} />
      </View>
      
      <View style={styles.balanceContainer}>
        <SensitiveText
          isHidden={privacyMode}
          length={SensitiveTextLength.Long}
          variant={TextVariant.DisplayMD}
        >
          {totalFiatBalance}
        </SensitiveText>
        <TouchableOpacity
          onPress={() => toggleIsBalanceAndAssetsHidden(!privacyMode)}
          testID="balance-container"
        >
          <Icon
            style={styles.privacyIcon}
            name={privacyMode ? IconName.EyeSlash : IconName.Eye}
            size={IconSize.Md}
            color={colors.text.muted}
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.tokenList}>
        {tokenBalances.map(renderTokenItem)}
      </View>
      
      <View style={styles.buttonContainer}>
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Md}
          width={ButtonWidthTypes.Full}
          onPress={goBack}
          label={strings('navigation.back')}
          testID="card-balance-back-button-bottom"
        />
      </View>
    </View>
  );
};

export default CardBalance;
