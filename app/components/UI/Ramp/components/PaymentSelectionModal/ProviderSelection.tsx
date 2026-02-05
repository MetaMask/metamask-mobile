import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import HeaderCompactStandard from '../../../../../component-library/components-temp/HeaderCompactStandard';
import type { Provider } from '@metamask/ramps-controller';
import { strings } from '../../../../../../locales/i18n';

interface ProviderSelectionProps {
  providers: Provider[];
  selectedProvider: Provider | null;
  onProviderSelect: (provider: Provider) => void;
  onBack: () => void;
}

const ProviderSelection: React.FC<ProviderSelectionProps> = ({ onBack }) => (
  <Box twClassName="flex-1">
    <HeaderCompactStandard
      title={strings('fiat_on_ramp.providers')}
      onBack={onBack}
    />
  </Box>
);

export default ProviderSelection;
