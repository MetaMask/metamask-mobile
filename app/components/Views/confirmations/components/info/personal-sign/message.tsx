import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, TextStyle, View } from 'react-native';
import { hexToText } from '@metamask/controller-utils';
import { numberToHex } from '@metamask/utils';

import { strings } from '../../../../../../../locales/i18n';
import Text from '../../../../../../component-library/components/Texts/Text';
import { Theme } from '../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../styles/common';
import { useStyles } from '../../../../../../component-library/hooks';
import { sanitizeString } from '../../../../../../util/string';
import { getSIWEDetails, SIWEMessage } from '../../../utils/signature';
import { useSignatureRequest } from '../../../hooks/signatures/useSignatureRequest';
import Address from '../../UI/info-row/info-value/address';
import InfoDate from '../../UI/info-row/info-value/info-date';
import InfoRow from '../../UI/info-row';
import Network from '../../UI/info-row/info-value/network';
import SignatureMessageSection from '../../signature-message-section';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    messageExpanded: {
      color: theme.colors.text.default,
      ...fontStyles.normal,
      fontSize: 14,
      fontWeight: '400',
    },
    siweTos: {
      color: theme.colors.text.default,
      ...fontStyles.normal,
      fontSize: 14,
      fontWeight: '400',
      paddingHorizontal: 8,
      marginBottom: 8,
    },
  });
};

const DetailedSIWEMessage = ({
  parsedMessage,
  styles,
}: {
  parsedMessage: SIWEMessage;
  styles: { siweTos: StyleProp<TextStyle> };
}) => {
  const {
    uri,
    chainId,
    address,
    version,
    nonce,
    issuedAt,
    requestId,
    resources,
  } = parsedMessage;
  return (
    <View>
      <Text style={styles.siweTos}>{parsedMessage?.statement}</Text>
      <InfoRow label={strings('confirm.siwe_message.url')}>{uri}</InfoRow>
      <InfoRow label={strings('confirm.siwe_message.network')}>
        <Network chainId={numberToHex(parseInt(chainId))} />
      </InfoRow>
      <InfoRow label={strings('confirm.siwe_message.account')}>
        <Address address={address} chainId={chainId} />
      </InfoRow>
      <InfoRow label={strings('confirm.siwe_message.version')}>
        {version}
      </InfoRow>
      <InfoRow label={strings('confirm.siwe_message.chain_id')}>
        {chainId.toString()}
      </InfoRow>
      <InfoRow label={strings('confirm.siwe_message.nonce')}>{nonce}</InfoRow>
      <InfoRow label={strings('confirm.siwe_message.issued')}>
        <InfoDate
          unixTimestamp={Math.floor(new Date(issuedAt).getTime() / 1000)}
        />
      </InfoRow>
      {requestId && (
        <InfoRow label={strings('confirm.siwe_message.requestId')}>
          {requestId}
        </InfoRow>
      )}
      {resources && (
        <InfoRow label={strings('confirm.siwe_message.resources')}>
          {resources.map((resource, index) => (
            <Text key={`resource-${index}`}>{resource}</Text>
          ))}
        </InfoRow>
      )}
    </View>
  );
};

const Message = () => {
  const signatureRequest = useSignatureRequest();
  const { styles } = useStyles(styleSheet, {});

  const { isSIWEMessage, parsedMessage } = useMemo(
    () => getSIWEDetails(signatureRequest),
    [signatureRequest],
  );

  const completeMessage = useMemo(() => {
    if (!signatureRequest?.messageParams?.data) {
      return '';
    }
    return sanitizeString(
      hexToText(signatureRequest?.messageParams?.data as string),
    );
  }, [signatureRequest?.messageParams?.data]);

  return (
    <SignatureMessageSection
      messageCollapsed={
        isSIWEMessage ? parsedMessage?.statement : completeMessage
      }
      messageExpanded={
        isSIWEMessage ? (
          <DetailedSIWEMessage parsedMessage={parsedMessage} styles={styles} />
        ) : (
          <Text style={styles.messageExpanded}>{completeMessage}</Text>
        )
      }
      copyMessageText={completeMessage}
      collapsedSectionAllowMultiline
    />
  );
};

export default Message;
