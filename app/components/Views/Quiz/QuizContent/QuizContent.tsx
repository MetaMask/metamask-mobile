import React from 'react';
import { View, Image } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { IQuizInformationProps } from '../types';
import Icon, {
  IconSize,
  IconName,
} from '../../../../component-library/components/Icon';
import Button, {
  ButtonSize,
} from '../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../hooks/useStyles';
import stylesheet from './styles';

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

  return (
    <View style={styles.container}>
      <>
        <View style={styles.header}>
          <View style={styles.spacer} />
          <Text variant={TextVariant.HeadingSM} style={styles.headerText}>
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
        {image ? <Image source={image} style={styles.image} /> : null}
        <Text
          variant={TextVariant.HeadingLG}
          style={{ ...styles.title, ...title.style }}
        >
          {title.content}
        </Text>
        {content ? (
          <Text variant={TextVariant.BodyMD} style={styles.content}>
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
      </View>
    </View>
  );
};

export default QuizContent;
