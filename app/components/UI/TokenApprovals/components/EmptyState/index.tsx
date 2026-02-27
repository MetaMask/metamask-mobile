import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  card: {
    alignItems: 'center',
    borderRadius: 16,
    padding: 32,
    width: '100%',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
  },
});

const EmptyState: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.background.muted }]}>
        <View
          style={[styles.iconCircle, { backgroundColor: colors.success.muted }]}
        >
          <Icon
            name={IconName.SecurityTick}
            size={IconSize.Xl}
            color={IconColor.Success}
          />
        </View>
        <Text
          variant={TextVariant.HeadingSM}
          color={TextColor.Default}
          style={styles.title}
        >
          {strings('token_approvals.empty_title')}
        </Text>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.description}
        >
          {strings('token_approvals.empty_description')}
        </Text>
      </View>
    </View>
  );
};

export default EmptyState;
