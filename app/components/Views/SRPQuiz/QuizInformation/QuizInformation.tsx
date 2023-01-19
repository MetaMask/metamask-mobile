import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { IQuizInformationProps } from '../types'
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

const QuizInformation = ({
  title,
  content,
  btnLabel,
  onContinuePress,
}: IQuizInformationProps) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const navigation = useNavigation();
  const { styles } = useStyles(stylesheet, {});

  const openSupportArticle = () => {
    // eslint-disable-next-line no-console
    console.log('execute openSupportArticle method');
  };

  return (
    <View style={styles.bodyContainer}>
      <Text variant={TextVariants.sHeadingLG} style={styles.title}>
        {title}
      </Text>
      {content ? (
        <Text variant={TextVariants.sBodyMD} style={styles.content}>
          {content}
        </Text>
      ) : null}
      <Button
        variant={ButtonVariants.Primary}
        onPress={onContinuePress}
        label={btnLabel}
        style={styles.button}
      />
      <Button
        variant={ButtonVariants.Tertiary}
        onPress={openSupportArticle}
        label={strings('srp_security_quiz.learn_more')}
      />
    </View>
  );
};

export default QuizInformation;
