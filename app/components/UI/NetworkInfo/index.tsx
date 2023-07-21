/* eslint-disable no-mixed-spaces-and-tabs */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import StyledButton from '../StyledButton';
import { strings } from '../../../../locales/i18n';
import { RPC } from '../../../constants/network';
import { connect, useSelector } from 'react-redux';
import Description from './InfoDescription';
import { useTheme } from '../../../util/theme';
import {
  NETWORK_EDUCATION_MODAL_CONTAINER_ID,
  NETWORK_EDUCATION_MODAL_NETWORK_NAME_ID,
} from '../../../../wdio/screen-objects/testIDs/Components/NetworkEducationModalTestIds';
import { fontStyles } from '../../../styles/common';
import { isTokenDetectionSupportedForNetwork } from '@metamask/assets-controllers/dist/assetsUtil';
import { NETWORK_EDUCATION_MODAL_CLOSE_BUTTON } from '../../../../wdio/screen-objects/testIDs/Screens/NetworksScreen.testids.js';
import { selectProviderConfig } from '../../../selectors/networkController';
import { selectUseTokenDetection } from '../../../selectors/preferencesController';
import {
  getNetworkImageSource,
  getNetworkNameFromProvider,
} from '../../../util/networks';
import Avatar, {
  AvatarVariants,
} from '../../../component-library/components/Avatars/Avatar';
import { ProviderConfig } from '@metamask/network-controller';
import generateTestId from '../../../../wdio/utils/generateTestId';

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
      marginLeft: 8,
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
  isTokenDetectionEnabled: boolean;
}

const NetworkInfo = (props: NetworkInfoProps) => {
  const { onClose, ticker, isTokenDetectionEnabled } = props;
  const networkProvider: ProviderConfig = useSelector(selectProviderConfig);
  const { type, ticker: networkTicker, rpcTarget, chainId } = networkProvider;
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const isTokenDetectionSupported =
    isTokenDetectionSupportedForNetwork(chainId);

  const isTokenDetectionEnabledForNetwork = useMemo(() => {
    if (isTokenDetectionSupported && isTokenDetectionEnabled) {
      return true;
    }
    return false;
  }, [isTokenDetectionEnabled, isTokenDetectionSupported]);

  const networkImageSource = useMemo(
    () =>
      getNetworkImageSource({
        networkType: networkProvider.type,
        chainId: networkProvider.chainId,
      }),
    [networkProvider],
  );

  const networkName = useMemo(
    () => getNetworkNameFromProvider(networkProvider),
    [networkProvider],
  );

  return (
    <View style={styles.wrapper}>
      <View
        style={styles.modalContentView}
        {...generateTestId(Platform, NETWORK_EDUCATION_MODAL_CONTAINER_ID)}
      >
        <Text style={styles.title}>
          {strings('network_information.switched_network')}
        </Text>
        <View style={styles.tokenView}>
          <View style={styles.tokenType}>
            <Avatar
              variant={AvatarVariants.Network}
              name={networkName.toUpperCase()}
              imageSource={networkImageSource}
            />
            <Text
              style={styles.tokenText}
              {...generateTestId(
                Platform,
                NETWORK_EDUCATION_MODAL_NETWORK_NAME_ID,
              )}
            >
              {networkName}
            </Text>
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
              isTokenDetectionEnabledForNetwork
                ? strings('network_information.token_detection_mainnet_title')
                : strings('network_information.third_description')
            }
            clickableText={
              isTokenDetectionEnabledForNetwork
                ? strings('network_information.token_detection_mainnet_link')
                : strings('network_information.add_token_manually')
            }
            number={3}
            isTokenDetectionLinkEnabled={
              isTokenDetectionSupported && !isTokenDetectionEnabled
            }
            onClose={onClose}
          />
        </View>
        <StyledButton
          type="confirm"
          onPress={onClose}
          containerStyle={styles.closeButton}
          testID={NETWORK_EDUCATION_MODAL_CLOSE_BUTTON}
        >
          {strings('network_information.got_it')}
        </StyledButton>
      </View>
    </View>
  );
};

const mapStateToProps = (state: any) => ({
  isTokenDetectionEnabled: selectUseTokenDetection(state),
});

export default connect(mapStateToProps)(NetworkInfo);
