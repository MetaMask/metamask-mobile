import React from 'react';
import { View } from 'react-native';
import Text from '../../../component-library/components/Texts/Text';
import { useTheme } from '../../../util/theme';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import createStyles from './FeatureItem.styles';

interface FeatureItemProps {
  title: string;
  description: string;
}

const FeatureItem = ({ title, description }: FeatureItemProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Icon
          name={IconName.Info}
          size={IconSize.Md}
          color={colors.primary.default}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
};

export default FeatureItem;
