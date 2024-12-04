import React, { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import CopyButton from '../../UI/CopyButton';
import ExpandableSection from '../../UI/ExpandableSection';
import { IconVerticalPosition } from '../../UI/ExpandableSection/ExpandableSection';
import styleSheet from './SignatureMessageSection.styles';

interface SignatureMessageSectionProps {
  messageCollapsed: ReactNode | string;
  messageExpanded: ReactNode;
  copyMessageText: string;
}

const SignatureMessageSection = ({
  messageCollapsed,
  messageExpanded,
  copyMessageText,
}: SignatureMessageSectionProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <ExpandableSection
      collapsedContent={
        <View style={styles.container}>
          <Text style={styles.title}>{strings('confirm.message')}</Text>
          <View style={styles.message}>
            {typeof messageCollapsed === 'string' ? (
              <Text style={styles.description} numberOfLines={1}>
                {messageCollapsed}
              </Text>
            ) : (
              messageCollapsed
            )}
          </View>
        </View>
      }
      expandedContent={
        <View style={styles.messageContainer}>
          <View style={styles.copyButtonContainer}>
            <CopyButton copyText={copyMessageText} />
          </View>
          {messageExpanded}
        </View>
      }
      expandedContentTitle={strings('confirm.message')}
      iconVerticalPosition={IconVerticalPosition.Top}
    />
  );
};

export default SignatureMessageSection;
