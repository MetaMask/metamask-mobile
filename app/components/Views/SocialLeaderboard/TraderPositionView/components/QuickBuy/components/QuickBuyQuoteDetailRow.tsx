import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import {
  KeyValueRowStubs,
  KeyValueRowSectionAlignments,
} from '../../../../../../../component-library/components-temp/KeyValueRow';
import { IconName as IconNameLegacy } from '../../../../../../../component-library/components/Icons/Icon';

const bridgeInfoTooltip = {
  iconName: IconNameLegacy.Info,
} as const;

interface QuickBuyQuoteDetailRowProps {
  label: string;
  tooltipTitle: string;
  tooltipContent: string;
  value: React.ReactNode;
}

/** Key/value row with Bridge-style info tooltip on the label. */
export const QuickBuyQuoteDetailRow: React.FC<QuickBuyQuoteDetailRowProps> = ({
  label,
  tooltipTitle,
  tooltipContent,
  value,
}) => (
  <KeyValueRowStubs.Root>
    <KeyValueRowStubs.Section>
      <KeyValueRowStubs.Label
        label={
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {label}
          </Text>
        }
        tooltip={{
          title: tooltipTitle,
          content: tooltipContent,
          ...bridgeInfoTooltip,
        }}
      />
    </KeyValueRowStubs.Section>
    <KeyValueRowStubs.Section align={KeyValueRowSectionAlignments.RIGHT}>
      {value}
    </KeyValueRowStubs.Section>
  </KeyValueRowStubs.Root>
);

interface QuickBuyQuoteDetailTextValueProps {
  text: string;
}

export const QuickBuyQuoteDetailTextValue: React.FC<
  QuickBuyQuoteDetailTextValueProps
> = ({ text }) => <KeyValueRowStubs.Label label={{ text }} />;

interface QuickBuyQuoteDetailPressableValueProps {
  onPress: () => void;
  testID: string;
  text: string;
  iconName: IconName;
}

export const QuickBuyQuoteDetailPressableValue: React.FC<
  QuickBuyQuoteDetailPressableValueProps
> = ({ onPress, testID, text, iconName }) => (
  <TouchableOpacity onPress={onPress} testID={testID} activeOpacity={0.6}>
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={1}
    >
      <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
        {text}
      </Text>
      <Icon name={iconName} size={IconSize.Sm} color={IconColor.IconDefault} />
    </Box>
  </TouchableOpacity>
);
