import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Button, { ButtonSize, ButtonVariants } from '../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../hooks/useStyles';
import stylesheet from './styles';

const QuizInformation = ({ styles }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const navigation = useNavigation();

  return (
    <View style={styles}>
      <Button
        variant={ButtonVariants.Primary}
        onPress={() => console.log('hello')}
        label={'hello'}
      />
    </View>
  );
};

export default QuizInformation;
