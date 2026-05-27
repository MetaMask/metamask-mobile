import React from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { PREDICT_WORLD_CUP_FALLBACK_STAGE_TAB_KEYS } from '../../../../../../UI/Predict/constants/worldCupTabs';
import { bracketPillLabel } from './bracketPillLabel';

interface BracketPillsProps {
  onPropsPress: () => void;
  onStagePress: (stageKey: string) => void;
}

const BracketPills = ({ onPropsPress, onStagePress }: BracketPillsProps) => {
  const tw = useTailwind();
  const pillStyle = tw.style(
    'shrink-0 items-center justify-center rounded-xl bg-muted px-3 py-2 active:opacity-80',
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={tw.style('mt-3 grow-0')}
      contentContainerStyle={tw.style('gap-2 px-4 pb-3')}
      testID="homepage-predict-discovery-bracket-pills"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings('predict.homepage_discovery.props_pill')}
        onPress={onPropsPress}
        style={pillStyle}
        testID="homepage-predict-discovery-pill-props"
      >
        <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
          {strings('predict.homepage_discovery.props_pill')}
        </Text>
      </Pressable>
      {PREDICT_WORLD_CUP_FALLBACK_STAGE_TAB_KEYS.map((key) => {
        const label = bracketPillLabel(key);
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => onStagePress(key)}
            style={pillStyle}
            testID={`homepage-predict-discovery-pill-${key}`}
          >
            <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

export default BracketPills;
