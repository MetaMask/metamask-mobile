import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import { Verdict } from '../../types';

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 24,
    alignSelf: 'flex-start',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

interface RiskBadgeProps {
  verdict: Verdict;
}

const RiskBadge: React.FC<RiskBadgeProps> = ({ verdict }) => {
  const { colors } = useTheme();

  const badgeColors = {
    [Verdict.Malicious]: {
      bg: colors.error.muted,
      dot: colors.error.default,
      text: TextColor.Error,
    },
    [Verdict.Warning]: {
      bg: colors.warning.muted,
      dot: colors.warning.default,
      text: TextColor.Warning,
    },
    [Verdict.Benign]: {
      bg: colors.success.muted,
      dot: colors.success.default,
      text: TextColor.Success,
    },
    [Verdict.Error]: {
      bg: colors.background.alternative,
      dot: colors.icon.muted,
      text: TextColor.Alternative,
    },
  };

  const { bg, dot, text } = badgeColors[verdict];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <Text variant={TextVariant.BodyXS} color={text}>
        {verdict}
      </Text>
    </View>
  );
};

export default RiskBadge;
