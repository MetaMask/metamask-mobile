import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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

const QuizInformation = ({ styles }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const navigation = useNavigation();

  return (
    <View style={styles}>
      <Text variant={TextVariants.lHeadingLG}>
        {strings('srp_security_quiz.introduction')}
      </Text>
      <Button
        variant={ButtonVariants.Primary}
        onPress={() => console.log('hello')}
        label={strings('srp_security_quiz.get_started')}
      />
      <Button
        variant={ButtonVariants.Tertiary}
        onPress={() => console.log('hello')}
        label={strings('srp_security_quiz.learn_more')}
      />
    </View>
  );
};

export default QuizInformation;
