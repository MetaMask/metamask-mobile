import React, { useCallback } from 'react';
import { useWindowDimensions } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { Box } from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import HeaderCenter from '../../../../../component-library/components-temp/HeaderCenter/HeaderCenter';
import RemoteImage from '../../../../Base/RemoteImage';
import PaymentMethodQuote from './PaymentMethodQuote';
import { useTheme } from '../../../../../util/theme';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './PaymentSelectionModal.styles';
import type { Provider } from '@metamask/ramps-controller';
import { strings } from '../../../../../../locales/i18n';

interface ProviderSelectionProps {
  providers: Provider[];
  selectedProvider: Provider | null;
  onProviderSelect: (provider: Provider) => void;
  onBack: () => void;
}

const ProviderSelection: React.FC<ProviderSelectionProps> = ({
  providers,
  selectedProvider,
  onProviderSelect,
  onBack,
}) => {
  const { themeAppearance } = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, { screenHeight, screenWidth });

  const mockQuote = {
    cryptoAmount: '0.10596 ETH',
    fiatAmount: '~ $499.97',
  };

  const renderProviderItem = useCallback(
    ({ item: provider }: { item: Provider }) => {
      const isSelected = provider.id === selectedProvider?.id;
      const logoUrl = provider.logos?.[themeAppearance];
      const hasLogo =
        logoUrl && provider.logos?.width && provider.logos?.height;

      return (
        <ListItemSelect
          isSelected={isSelected}
          onPress={() => onProviderSelect(provider)}
          accessibilityRole="button"
          accessible
        >
          <ListItemColumn widthType={WidthType.Auto}>
            {hasLogo ? (
              <RemoteImage
                style={{
                  width: provider.logos.width,
                  height: provider.logos.height,
                }}
                source={{ uri: logoUrl }}
              />
            ) : (
              <Box twClassName="w-10 h-10 rounded-full bg-muted items-center justify-center">
                <Text variant={TextVariant.BodyMDMedium}>
                  {provider.name?.charAt(0) ?? '?'}
                </Text>
              </Box>
            )}
          </ListItemColumn>
          <ListItemColumn widthType={WidthType.Fill}>
            <Text variant={TextVariant.BodyLGMedium}>
              {provider.name ?? 'Unknown'}
            </Text>
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              temporary description
            </Text>
          </ListItemColumn>
          <ListItemColumn widthType={WidthType.Auto}>
            <PaymentMethodQuote
              cryptoAmount={mockQuote.cryptoAmount}
              fiatAmount={mockQuote.fiatAmount}
            />
          </ListItemColumn>
        </ListItemSelect>
      );
    },
    [
      selectedProvider?.id,
      themeAppearance,
      onProviderSelect,
      mockQuote.cryptoAmount,
      mockQuote.fiatAmount,
    ],
  );

  return (
    <Box twClassName="flex-1">
      <HeaderCenter
        title={strings('fiat_on_ramp_aggregator.providers')}
        onBack={onBack}
      />
      <FlatList
        style={styles.list}
        data={providers}
        renderItem={renderProviderItem}
        keyExtractor={(item) => item.id}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
      />
    </Box>
  );
};

export default ProviderSelection;
