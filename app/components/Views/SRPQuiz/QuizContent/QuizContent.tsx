import React from 'react';
import { View, Image, Linking } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { IQuizInformationProps } from '../types';
import Icon, {
  IconSize,
  IconName,
} from '../../../../component-library/components/Icon';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariants,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../hooks/useStyles';
import { strings } from '../../../../../locales/i18n';
import stylesheet from './styles';
import { SRP_GUIDE_URL } from '../../../../constants/urls';

const QuizContent = ({
  header,
  image,
  title,
  content,
  icon,
  buttons,
  dismiss,
}: IQuizInformationProps) => {
  const { styles, theme } = useStyles(stylesheet, {});
  const { colors } = theme;

  const openSupportArticle = () => {
    Linking.openURL(SRP_GUIDE_URL);
  };

  return (
    <View style={styles.container}>
      <>
        <View style={styles.header}>
          <View style={styles.spacer} />
          <Text variant={TextVariants.sHeadingSM} style={styles.headerText}>
            {header}
          </Text>
          <TouchableOpacity onPress={dismiss}>
            <Icon
              size={IconSize.Xs}
              name={IconName.CloseOutline}
              color={colors.icon.default}
              style={styles.icon}
            />
          </TouchableOpacity>
        </View>
        {icon ? icon() : null}
        {image ? <Image source={image} /> : null}
        <Text
          variant={TextVariants.sHeadingLG}
          style={{ ...styles.title, ...title.style }}
        >
          {title.content}
        </Text>
        {content ? (
          <Text variant={TextVariants.sBodyMD} style={styles.content}>
            {content}
          </Text>
        ) : null}
      </>
      <View style={styles.bottomContainer}>
        {buttons.map((btn, idx) => (
          <Button
            key={idx}
            variant={btn.variant}
            size={ButtonSize.Lg}
            onPress={btn.onPress}
            label={btn.label}
            style={styles.button}
          />
        ))}
        <Button
          variant={ButtonVariants.Tertiary}
          onPress={openSupportArticle}
          label={strings('srp_security_quiz.learn_more')}
          style={styles.button}
        />
      </View>
    </View>
  );
};

export default QuizContent;
