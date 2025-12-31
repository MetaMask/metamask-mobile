import React, { useState } from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';

interface PredictOutcomeRulesProps {
  description: string;
  title?: string;
}

const PredictOutcomeRules: React.FC<PredictOutcomeRulesProps> = ({
  description,
  title,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { colors } = useTheme();

  if (!description) return null;

  return (
    <Box twClassName="mt-3 border-t border-muted pt-3">
      <Pressable onPress={() => setIsExpanded(!isExpanded)}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2"
        >
          <Icon
            name={IconName.Book}
            size={IconSize.Sm}
            color={colors.primary.default}
          />
          <Text variant={TextVariant.BodySm} color={TextColor.PrimaryDefault}>
            {isExpanded
              ? strings('predict.market_details.hide_rules')
              : strings('predict.market_details.show_rules')}
          </Text>
          <Icon
            name={isExpanded ? IconName.ArrowUp : IconName.ArrowDown}
            size={IconSize.Xs}
            color={colors.primary.default}
          />
        </Box>
      </Pressable>
      {isExpanded && (
        <Box twClassName="mt-3 p-3 bg-muted rounded-lg">
          {title && (
            <Text
              variant={TextVariant.BodySmBold}
              color={TextColor.TextDefault}
              twClassName="mb-2"
            >
              {title}
            </Text>
          )}
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {description}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default PredictOutcomeRules;

