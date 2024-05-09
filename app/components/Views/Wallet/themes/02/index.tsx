import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';

import ErrorBoundary from '../../../ErrorBoundary';
import { NftBackground } from '../../../../Base/NFT';
import { SmartActions, Action } from '../../../../Base/SmartActions';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectSelectedAddress } from '../../../../../selectors/preferencesController';
import { WalletAccount } from '../../../../../components/UI/WalletAccount';
import { useAccounts } from '../../../../../components/hooks/useAccounts';
import { getTicker } from '../../../../../util/transactions';
import {
  hexToBN,
  renderFromWei,
  toHexadecimal,
  weiToFiat,
} from '../../../../../util/number';
import { selectAccountsByChainId } from '../../../../../selectors/accountTrackerController';
import {
  selectProviderConfig,
  selectTicker,
} from '../../../../../selectors/networkController';
import { selectTokens } from '../../../../../selectors/tokensController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import Tokens from '../../../../../components/UI/Tokens';
import CollectibleContracts from '../../../../../components/UI/CollectibleContracts';

const Custom01 = () => {
  const navigation = useNavigation();

  const [showAccounts, setShowAccounts] = useState(true);
  const [showTokens, setShowTokens] = useState(false);
  const [showNfts, setShowNfts] = useState(false);

  const [backgroundImage, setBackgroundImage] = useState();

  const tokens = useSelector(selectTokens);

  const { accounts, ensByAccountAddress } = useAccounts();
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const ticker = useSelector(selectTicker);
  const providerConfig = useSelector(selectProviderConfig);
  /**
   * ETH to current currency conversion rate
   */
  const conversionRate = useSelector(selectConversionRate);
  /**
   * Currency code of the currently-active currency
   */
  const currentCurrency = useSelector(selectCurrentCurrency);
  const selectedAccount = useMemo(() => {
    if (accounts.length > 0) {
      return accounts.find((account) => account.isSelected);
    }
    return undefined;
  }, [accounts]);

  const ensForSelectedAccount = useMemo(() => {
    if (ensByAccountAddress && selectedAccount) {
      return ensByAccountAddress[selectedAccount.address];
    }
    return undefined;
  }, [ensByAccountAddress, selectedAccount]);

  const selectedAddress = useSelector(selectSelectedAddress);

  const handleSwitchMenu = (option: string) => {
    switch (option) {
      case 'accounts':
        setShowAccounts(true);
        setShowTokens(false);
        setShowNfts(false);
        break;
      case 'tokens':
        setShowAccounts(false);
        setShowTokens(true);
        setShowNfts(false);
        break;
      case 'nfts':
        setShowAccounts(false);
        setShowTokens(false);
        setShowNfts(true);
    }
  };

  const WALLET_SMART_ACTIONS: Action[] = [
    {
      title: 'Accounts',
      iconName: IconName.Graph,
      onPress: () => {
        handleSwitchMenu('accounts');
      },
      onLongPress: () => null,
      tooltip: 'teste',
    },
    {
      title: 'Tokens',
      label: 'Hot',
      iconName: IconName.Send2,
      onPress: () => {
        handleSwitchMenu('tokens');
      },
      onLongPress: () => null,
      tooltip: 'teste',
      disabled: false,
    },
    {
      title: 'NFTs',
      iconName: IconName.Received,
      onPress: () => {
        handleSwitchMenu('nfts');
      },
      onLongPress: () => null,
    },
  ];

  const renderAccounts = useCallback(
    () =>
      selectedAccount ? (
        <WalletAccount
          account={selectedAccount}
          ens={ensForSelectedAccount}
          // eslint-disable-next-line react-native/no-inline-styles
          style={{ marginBottom: 75 }}
        />
      ) : null,
    [ensForSelectedAccount, selectedAccount],
  );

  const renderTokens = useCallback(() => {
    let balance: any = 0;

    let assets = tokens;

    if (
      accountsByChainId?.[toHexadecimal(providerConfig.chainId)]?.[
        selectedAddress
      ]
    ) {
      balance = renderFromWei(
        accountsByChainId[toHexadecimal(providerConfig.chainId)][
          selectedAddress
        ].balance,
      );

      assets = [
        {
          // TODO: Add name property to Token interface in controllers.
          name: getTicker(ticker) === 'ETH' ? 'Ethereum' : ticker,
          symbol: getTicker(ticker),
          isETH: true,
          balance,
          balanceFiat: weiToFiat(
            hexToBN(
              accountsByChainId[toHexadecimal(providerConfig.chainId)][
                selectedAddress
              ].balance,
            ) as any,
            conversionRate,
            currentCurrency,
          ),
          logo: '../images/eth-logo-new.png',
        } as any,
        ...(tokens || []),
      ];
    } else {
      assets = tokens;
    }
    return (
      <Tokens
        navigation={navigation}
        // TODO - Consolidate into the correct type.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        tokens={assets}
      />
    );
  }, [
    accountsByChainId,
    conversionRate,
    currentCurrency,
    navigation,
    providerConfig.chainId,
    selectedAddress,
    ticker,
    tokens,
  ]);

  const renderNfts = useCallback(
    () => (
      <CollectibleContracts
        navigation={navigation}
        setBackgroundImage={setBackgroundImage}
      />
    ),
    [navigation],
  );

  const renderContent = useCallback(() => {
    if (showAccounts) {
      return renderAccounts();
    }
    if (showTokens) {
      return renderTokens();
    }
    if (showNfts) {
      return renderNfts();
    }
    return;
  }, [
    renderAccounts,
    renderTokens,
    renderNfts,
    showAccounts,
    showTokens,
    showNfts,
  ]);

  return (
    <ErrorBoundary navigation={navigation} view="Wallet">
      <NftBackground image={backgroundImage} />
      <SmartActions actions={WALLET_SMART_ACTIONS} showToolTips />

      <ScrollView style={{ marginTop: 175 }}>{renderContent()}</ScrollView>
    </ErrorBoundary>
  );
};

export default Custom01;
