import React from 'react';
import createStyles from '../../styles';
import { useTheme } from '../../../../../util/theme';
import { TouchableOpacity, View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import { strings } from '../../../../../../locales/i18n';
import { useSelector } from 'react-redux';
import { selectDetectedTokens } from '../../../../../selectors/tokensController';
import { isZero } from '../../../../../util/lodash';
import useRampNetwork from '../../../Ramp/hooks/useRampNetwork';
import { createBuyNavigationDetails } from '../../../Ramp/routes/utils';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  MetaMetricsEvents,
  useMetrics,
} from '../../../../../components/hooks/useMetrics';
import { getDecimalChainId } from '../../../../../util/networks';
import { selectChainId } from '../../../../../selectors/networkController';

interface TokenListFooterProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tokens: any[];
  isAddTokenEnabled: boolean;
  goToAddToken: () => void;
  showDetectedTokens: () => void;
}

export const TokenListFooter = ({
  tokens,
  isAddTokenEnabled,
  goToAddToken,
  showDetectedTokens,
}: TokenListFooterProps) => {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { colors } = useTheme();
  const { trackEvent } = useMetrics();
  const [isNetworkRampSupported, isNativeTokenRampSupported] = useRampNetwork();

  const detectedTokens = useSelector(selectDetectedTokens);
  const chainId = useSelector(selectChainId);

  const styles = createStyles(colors);

  const mainToken = tokens.find(({ isETH }) => isETH);
  const isBuyableToken =
    mainToken &&
    isZero(mainToken.balance) &&
    isNetworkRampSupported &&
    isNativeTokenRampSupported;

  const goToBuy = () => {
    navigation.navigate(...createBuyNavigationDetails());
    trackEvent(MetaMetricsEvents.BUY_BUTTON_CLICKED, {
      text: 'Buy Native Token',
      location: 'Home Screen',
      chain_id_destination: getDecimalChainId(chainId),
    });
  };

  return (
    <>
      {/* renderTokensDetectedSection */}
      {detectedTokens && (
        <TouchableOpacity
          style={styles.tokensDetectedButton}
          onPress={showDetectedTokens}
        >
          <Text
            style={styles.tokensDetectedText}
            testID={WalletViewSelectorsIDs.WALLET_TOKEN_DETECTION_LINK_BUTTON}
          >
            {strings('wallet.tokens_detected_in_account', {
              tokenCount: detectedTokens.length,
              tokensLabel: detectedTokens.length > 1 ? 'tokens' : 'token',
            })}
          </Text>
        </TouchableOpacity>
      )}
      {/* render buy button */}
      {isBuyableToken && (
        <View style={styles.buy}>
          <Text variant={TextVariant.HeadingSM} style={styles.buyTitle}>
            {strings('wallet.add_to_get_started')}
          </Text>
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            style={styles.buyButton}
            onPress={goToBuy}
            label={strings('wallet.buy_asset', { asset: mainToken.symbol })}
          />
        </View>
      )}
      {/* render footer */}
      <View style={styles.footer} key={'tokens-footer'}>
        <TouchableOpacity
          style={styles.add}
          onPress={goToAddToken}
          disabled={!isAddTokenEnabled}
          testID={WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON}
        >
          <Text style={styles.centered}>
            <Text style={styles.emptyText}>
              {strings('wallet.no_available_tokens')}
            </Text>{' '}
            <Text style={styles.addText}>{strings('wallet.add_tokens')}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
};
