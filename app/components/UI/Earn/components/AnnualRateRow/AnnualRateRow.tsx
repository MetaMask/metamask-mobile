import {
  FontWeight as DesignSystemFontWeight,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor as DesignSystemTextColor,
  TextVariant as DesignSystemTextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { Pressable, View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import DottedUnderline from '../../../DottedUnderline';

export interface AnnualRateRowProps {
  annualRewardRate: string;
  isLoading: boolean;
  isPrivacyModeEnabled: boolean;
  onPress: () => void;
  testID: string;
}

const AnnualRateRow = ({
  annualRewardRate,
  isLoading,
  isPrivacyModeEnabled,
  onPress,
  testID,
}: AnnualRateRowProps) => {
  const { colors } = useTheme();
  const tw = useTailwind();

  return (
    <View style={tw.style('py-2 flex-row justify-between')}>
      <View style={tw.style('flex-row items-center')}>
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={strings(
            'stake.accessibility_labels.stake_annual_rate_tooltip',
          )}
          onPress={onPress}
          style={({ pressed }) => tw.style(pressed && 'opacity-50')}
        >
          <DottedUnderline color={colors.text.alternative}>
            <Text
              variant={DesignSystemTextVariant.BodyMd}
              fontWeight={DesignSystemFontWeight.Medium}
              color={DesignSystemTextColor.TextAlternative}
            >
              {strings('stake.annual_rate')}
            </Text>
          </DottedUnderline>
        </Pressable>
      </View>
      {isLoading ? (
        <SkeletonPlaceholder>
          <SkeletonPlaceholder.Item width={100} height={20} borderRadius={6} />
        </SkeletonPlaceholder>
      ) : (
        <SensitiveText
          variant={DesignSystemTextVariant.BodyMd}
          fontWeight={DesignSystemFontWeight.Medium}
          color={DesignSystemTextColor.SuccessDefault}
          isHidden={isPrivacyModeEnabled}
          length={SensitiveTextLength.Short}
          testID={`${testID}-value`}
        >
          {`${annualRewardRate} APR`}
        </SensitiveText>
      )}
    </View>
  );
};

export default AnnualRateRow;
