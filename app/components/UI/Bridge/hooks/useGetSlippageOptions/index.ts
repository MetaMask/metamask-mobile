import { capitalize } from 'lodash';
import { strings } from '../../../../../../locales/i18n';
import { SlippageType } from '../../types';

interface Props {
  allowCustomSlippage?: boolean;
  slippageOptions: readonly string[];
  slippage: string;
  onDefaultOptionPress: (value: SlippageType) => () => void;
  onCustomOptionPress?: () => void;
}

export const useGetSlippageOptions = ({
  allowCustomSlippage,
  slippageOptions,
  slippage,
  onDefaultOptionPress,
  onCustomOptionPress,
}: Props) => {
  const options = slippageOptions.map((value) => ({
    id: String(value),
    label: isNaN(parseFloat(value)) ? capitalize(value) : value + '%',
    onPress: onDefaultOptionPress(value),
    selected: String(value) === String(slippage),
  }));

  if (allowCustomSlippage && onCustomOptionPress) {
    options.push({
      id: 'custom-slippage',
      label: strings('bridge.custom'),
      onPress: onCustomOptionPress,
      selected: !slippageOptions.some(
        (value) => String(value) === String(slippage),
      ),
    });
  }

  return options;
};
