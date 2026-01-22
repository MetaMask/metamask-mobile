import React, { useCallback, useRef } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import PerpsProviderSelectorSheet from '../../components/PerpsProviderSelector/PerpsProviderSelectorSheet';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import type {
  PerpsProviderInfo,
  PerpsProviderType,
} from '../../controllers/types';

interface SelectProviderRouteParams {
  PerpsSelectProvider: {
    providers: PerpsProviderInfo[];
    activeProvider: PerpsProviderType;
    onSelectProvider: (providerId: PerpsProviderType) => void;
  };
}

const PerpsSelectProviderView: React.FC = () => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<SelectProviderRouteParams, 'PerpsSelectProvider'>>();
  const sheetRef = useRef<BottomSheetRef>(null);

  const { providers, activeProvider, onSelectProvider } = route.params;

  const handleSelectProvider = useCallback(
    (providerId: PerpsProviderType) => {
      onSelectProvider(providerId);
      sheetRef.current?.onCloseBottomSheet();
    },
    [onSelectProvider],
  );

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <PerpsProviderSelectorSheet
      providers={providers}
      activeProvider={activeProvider}
      onSelectProvider={handleSelectProvider}
      onClose={handleClose}
      sheetRef={sheetRef}
    />
  );
};

export default PerpsSelectProviderView;
