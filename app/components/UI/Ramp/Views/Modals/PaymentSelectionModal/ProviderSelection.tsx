import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import HeaderCompactStandard from '../../../../../../component-library/components-temp/HeaderCompactStandard';
import ListItemSelect from '../../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import type { Provider } from '@metamask/ramps-controller';
import { strings } from '../../../../../../../locales/i18n';

interface ProviderSelectionProps {
  onBack: () => void;
  providers: Provider[];
  selectedProvider: Provider | null;
  onProviderSelect: (provider: Provider) => void;
}

const ProviderSelection: React.FC<ProviderSelectionProps> = ({
  onBack,
  providers,
  selectedProvider,
  onProviderSelect,
}) => (
  <Box twClassName="flex-1">
    <HeaderCompactStandard
      title={strings('fiat_on_ramp_aggregator.providers')}
      onBack={onBack}
    />
    {providers.map((provider) => (
      <ListItemSelect
        key={provider.id}
        isSelected={selectedProvider?.id === provider.id}
        onPress={() => onProviderSelect(provider)}
        accessibilityRole="button"
        accessible
      >
        <ListItemColumn widthType={WidthType.Fill}>
          <Text variant={TextVariant.BodyLGMedium}>{provider.name}</Text>
        </ListItemColumn>
      </ListItemSelect>
    ))}
  </Box>
);

export default ProviderSelection;
