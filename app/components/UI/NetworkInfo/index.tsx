/* eslint-disable no-mixed-spaces-and-tabs */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import StyledButton from '../StyledButton';
import { strings } from '../../../../locales/i18n';
import NetworkMainAssetLogo from '../NetworkMainAssetLogo';
import { MAINNET, RPC } from '../../../constants/network';
import { connect } from 'react-redux';
import Description from './InfoDescription';
import { useAppThemeFromContext, mockTheme } from '../../../util/theme';
import {
  NETWORK_EDUCATION_MODAL_CONTAINER_ID,
  NETWORK_EDUCATION_MODAL_CLOSE_BUTTON_ID,
  NETWORK_EDUCATION_MODAL_NETWORK_NAME_ID,
} from '../../../constants/test-ids';
import { fontStyles } from '../../../styles/common';

const createStyles = (colors: {
  background: { default: string };
  text: { default: string };
  border: { muted: string };
}) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      borderRadius: 10,
    },
    modalContentView: {
      padding: 20,
    },
    title: {
      fontSize: 16,
      ...fontStyles.bold,
      marginVertical: 10,
      textAlign: 'center',
      color: colors.text.default,
    },
    tokenView: {
      marginBottom: 30,
      alignItems: 'center',
    },
    tokenType: {
      padding: 10,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      backgroundColor: colors.border.muted,
    },
    ethLogo: {
      width: 30,
      height: 30,
      overflow: 'hidden',
      marginHorizontal: 5,
    },
    tokenText: {
      fontSize: 15,
      color: colors.text.default,
      textAlign: 'center',
      paddingRight: 10,
    },
    capitalizeText: {
      textTransform: 'capitalize',
    },
    messageTitle: {
      fontSize: 14,
      ...fontStyles.bold,
      marginBottom: 15,
      textAlign: 'center',
      color: colors.text.default,
    },
    descriptionViews: {
      marginBottom: 15,
    },
    closeButton: {
      marginVertical: 20,
      borderColor: colors.border.muted,
    },
    rpcUrl: {
      ...fontStyles.normal,
      fontSize: 10,
      color: colors.border.muted,
      textAlign: 'center',
      paddingVertical: 5,
    },
    unknownWrapper: {
      backgroundColor: colors.background.default,
      marginRight: 6,
      height: 20,
      width: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unknownText: {
      ...fontStyles.normal,
      color: colors.text.default,
      fontSize: 13,
    },
  });

interface NetworkInfoProps {
  onClose: () => void;
  type: string;
  ticker: string;
  networkProvider: {
    nickname: string;
    type: string;
    ticker: {
      networkTicker: string;
    };
    rpcTarget: string;
  };
  isTokenDetectionEnabled: boolean;
}

const NetworkInfo = (props: NetworkInfoProps) => {
  const {
    onClose,
    ticker,
    isTokenDetectionEnabled,
    networkProvider: { nickname, type, ticker: networkTicker, rpcTarget },
  } = props;
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyles(colors);

  const isMainnetTokenDetectionEnabled = useMemo(() => {
    if (type === MAINNET && isTokenDetectionEnabled) {
      return true;
    }
    return false;
  }, [isTokenDetectionEnabled, type]);

  return (
    <View style={styles.wrapper}>
      <View
        style={styles.modalContentView}
        testID={NETWORK_EDUCATION_MODAL_CONTAINER_ID}
      >
        <Text style={styles.title}>
          {strings('network_information.switched_network')}
        </Text>
        <View style={styles.tokenView}>
          <View style={styles.tokenType}>
            {ticker === undefined ? (
              <>
                <View style={styles.unknownWrapper}>
                  <Text style={styles.unknownText}>?</Text>
                </View>
                <Text style={styles.tokenText}>
                  {`${nickname}` ||
                    strings('network_information.unknown_network')}
                </Text>
              </>
            ) : (
              <>
                <NetworkMainAssetLogo style={styles.ethLogo} />
                <Text
                  style={
                    type === RPC
                      ? styles.tokenText
                      : [styles.tokenText, styles.capitalizeText]
                  }
                  testID={NETWORK_EDUCATION_MODAL_NETWORK_NAME_ID}
                >
                  {type === RPC
                    ? `${nickname}`
                    : type === MAINNET
                    ? `${type}`
                    : `${strings('network_information.testnet_network', {
                        type,
                      })}`}
                </Text>
              </>
            )}
          </View>
          {ticker === undefined && (
            <Text style={styles.rpcUrl}>{rpcTarget}</Text>
          )}
        </View>
        <Text style={styles.messageTitle}>
          {strings('network_information.things_to_keep_in_mind')}:
        </Text>

        <View style={styles.descriptionViews}>
          <Description
            description={
              type !== RPC
                ? strings('network_information.first_description', { ticker })
                : [
                    networkTicker === undefined
                      ? strings('network_information.private_network')
                      : strings('network_information.first_description', {
                          ticker,
                        }),
                  ]
            }
            number={1}
            clickableText={undefined}
          />
          <Description
            description={strings('network_information.second_description')}
            clickableText={strings('network_information.learn_more')}
            number={2}
          />
          <Description
            description={
              isMainnetTokenDetectionEnabled
                ? strings('network_information.token_detection_mainnet_title')
                : strings('network_information.third_description')
            }
            clickableText={
              isMainnetTokenDetectionEnabled
                ? strings('network_information.token_detection_mainnet_link')
                : strings('network_information.add_token_manually')
            }
            number={3}
            isMainnetTokenDetectionEnabled={isMainnetTokenDetectionEnabled}
            onClose={onClose}
            network={type}
          />
        </View>
        <StyledButton
          type="confirm"
          onPress={onClose}
          containerStyle={styles.closeButton}
          testID={NETWORK_EDUCATION_MODAL_CLOSE_BUTTON_ID}
        >
          {strings('network_information.got_it')}
        </StyledButton>
      </View>
    </View>
  );
};

const mapStateToProps = (state: any) => ({
  isTokenDetectionEnabled:
    !state.engine.backgroundState.PreferencesController.useStaticTokenList,
  networkProvider: state.engine.backgroundState.NetworkController.provider,
});

export default connect(mapStateToProps)(NetworkInfo);
