import React, { ReactNode } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';

import { ConfirmationRowComponentIDs } from '../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { strings } from '../../../../../../locales/i18n';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import CopyButton from '../UI/copy-button';
import Expandable from '../UI/expandable';
import styleSheet from './signature-message-section.styles';
import InfoSection from '../UI/info-row/info-section';

interface SignatureMessageSectionProps {
  messageCollapsed?: ReactNode | string;
  messageExpanded: ReactNode;
  copyMessageText: string;
  collapsedSectionAllowMultiline?: boolean;
}

const SignatureMessageSection = ({
  messageCollapsed,
  messageExpanded,
  copyMessageText,
  collapsedSectionAllowMultiline = false,
}: SignatureMessageSectionProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <Expandable
      collapsedContent={
        <InfoSection>
          <View accessibilityRole="none" accessible={false} style={styles.container}>
            <View accessibilityRole="none" accessible={false}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('confirm.message')}
              </Text>
              {messageCollapsed && (
                <View accessibilityRole="none" accessible={false} style={styles.message}>
                  {typeof messageCollapsed === 'string' ? (
                    <Text
                      style={styles.description}
                      numberOfLines={
                        collapsedSectionAllowMultiline ? undefined : 1
                      }
                    >
                      {messageCollapsed}
                    </Text>
                  ) : (
                    messageCollapsed
                  )}
                </View>
              )}
            </View>
            <Icon
              style={styles.icon}
              color={IconColor.Muted}
              size={IconSize.Sm}
              name={IconName.ArrowRight}
            />
          </View>
        </InfoSection>
      }
      expandedContent={
        <View accessibilityRole="none" accessible={false} style={styles.messageContainer}>
          <View accessibilityRole="none" accessible={false} style={styles.copyButtonContainer}>
            <CopyButton copyText={copyMessageText} />
          </View>
          <ScrollView>
            <View accessibilityRole="none" accessible={false} style={styles.scrollableSection}>
              <TouchableOpacity>{messageExpanded}</TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      }
      expandedContentTitle={strings('confirm.message')}
      testID={ConfirmationRowComponentIDs.MESSAGE}
    />
  );
};

export default SignatureMessageSection;
