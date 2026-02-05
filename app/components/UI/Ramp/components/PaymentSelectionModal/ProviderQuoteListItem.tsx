import React from 'react';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import type { Quote } from '@metamask/ramps-controller';

interface ProviderQuoteListItemProps {
  providerName: string;
  quote: Quote;
  tokenSymbol?: string;
  onPress?: () => void;
}

const ProviderQuoteListItem: React.FC<ProviderQuoteListItemProps> = ({
  providerName,
  quote,
  tokenSymbol,
  onPress,
}) => {
  const amountOut =
    typeof quote.quote.amountOut === 'string'
      ? quote.quote.amountOut
      : String(quote.quote.amountOut);
  const quoteLabel = tokenSymbol ? `${amountOut} ${tokenSymbol}` : amountOut;

  return (
    <ListItemSelect onPress={onPress} accessibilityRole="button" accessible>
      <ListItemColumn widthType={WidthType.Fill}>
        <Text variant={TextVariant.BodyLGMedium}>{providerName}</Text>
      </ListItemColumn>
      <ListItemColumn widthType={WidthType.Auto}>
        <Text variant={TextVariant.BodyMDMedium}>{quoteLabel}</Text>
        {quote.quote.amountOutInFiat != null && (
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            ~ {quote.quote.amountOutInFiat}
          </Text>
        )}
      </ListItemColumn>
    </ListItemSelect>
  );
};

export default ProviderQuoteListItem;
