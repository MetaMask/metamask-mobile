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
import { TokenI } from '../../types';

interface TokenListFooterProps {
  tokens: TokenI[];
  goToAddToken: () => void;
  isAddTokenEnabled: boolean;
}

export const TokenListFooter = ({
  tokens,
  goToAddToken,
  isAddTokenEnabled,
}: TokenListFooterProps) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const [isNetworkRampSupported, isNativeTokenRampSupported] = useRampNetwork();

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
      </View>
    </>
  );
};
