import React, { useMemo } from 'react';
import createStyles from '../../styles';
import { useTheme } from '../../../../../util/theme';
import { TouchableOpacity, View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import { strings } from '../../../../../../locales/i18n';
import { useSelector } from 'react-redux';
import { isZero } from '../../../../../util/lodash';
import useRampNetwork from '../../../Ramp/hooks/useRampNetwork';
import { createBuyNavigationDetails } from '../../../Ramp/routes/utils';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { useNavigation } from '@react-navigation/native';
import {
  MetaMetricsEvents,
  useMetrics,
} from '../../../../../components/hooks/useMetrics';
import { getDecimalChainId } from '../../../../../util/networks';
import { selectChainId } from '../../../../../selectors/networkController';
import { selectIsEvmNetworkSelected } from '../../../../../selectors/multichainNetworkController';
import {
  selectEvmTokenFiatBalances,
  selectEvmTokens,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  selectMultichainTokenListForAccountId,
  ///: END:ONLY_INCLUDE_IF
} from '../../../../../selectors/multichain';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { RootState } from '../../../../../reducers';
///: END:ONLY_INCLUDE_IF

interface TokenListFooterProps {
  goToAddToken: () => void;
  isAddTokenEnabled: boolean;
}

export const TokenListFooter = ({
  goToAddToken,
  isAddTokenEnabled,
}: TokenListFooterProps) => {
  const chainId = useSelector(selectChainId);
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { trackEvent, createEventBuilder } = useMetrics();
  const [isNetworkRampSupported, isNativeTokenRampSupported] = useRampNetwork();
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const evmTokens = useSelector(selectEvmTokens);
  const tokenFiatBalances = useSelector(selectEvmTokenFiatBalances);
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const nonEvmTokens = useSelector((state: RootState) =>
    selectMultichainTokenListForAccountId(state, selectedAccount?.id),
  );
  ///: END:ONLY_INCLUDE_IF

  const tokenListData = isEvmSelected ? evmTokens : nonEvmTokens;

  const tokens = useMemo(
    () =>
      tokenListData.map((token, i) => ({
        ...token,
        tokenFiatAmount: isEvmSelected
          ? tokenFiatBalances[i]
          : token.balanceFiat,
      })),
    [tokenListData, tokenFiatBalances, isEvmSelected],
  );

  const mainToken = tokens.find(({ isETH }) => isETH);
  const isBuyableToken =
    mainToken &&
    isZero(mainToken.balance) &&
    isNetworkRampSupported &&
    isNativeTokenRampSupported;

  const goToBuy = () => {
    navigation.navigate(...createBuyNavigationDetails());
    trackEvent(
      createEventBuilder(MetaMetricsEvents.BUY_BUTTON_CLICKED)
        .addProperties({
          text: 'Buy Native Token',
          location: 'Home Screen',
          chain_id_destination: getDecimalChainId(chainId),
        })
        .build(),
    );
  };

  return (
    <>
      {/* render buy button */}
      {isBuyableToken && (
        <View style={styles.buy}>
          <Text variant={TextVariant.HeadingSM} style={styles.buyTitle}>
            {strings('wallet.token_is_needed_to_continue', {
              tokenSymbol: mainToken.symbol,
            })}
          </Text>
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            style={styles.buyButton}
            onPress={goToBuy}
            label={strings('wallet.next')}
          />
        </View>
      )}
      {/* render footer */}
      <View style={styles.footer} key={'tokens-footer'}>
        {isEvmSelected &&  (
          <TouchableOpacity
          style={styles.add}
          onPress={goToAddToken}
          disabled={!isAddTokenEnabled}
          testID={WalletViewSelectorsIDs.IMPORT_TOKEN_FOOTER_LINK}
        >
          <Text style={styles.centered}>
            <Text style={styles.emptyText}>
              {strings('wallet.no_available_tokens')}
            </Text>{' '}
            <Text style={styles.addText}>{strings('wallet.add_tokens')}</Text>
          </Text>
        </TouchableOpacity>
        )}
      </View>
    </>
  );
};
