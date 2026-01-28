import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Section from '../../../../Views/TrendingView/components/Sections/Section';
import { SECTIONS_CONFIG } from '../../../../Views/TrendingView/sections.config';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../constants/eventNames';
import { PredictEntryPointProvider } from '../../contexts';
import { PredictNavigationParamList } from '../../types/navigation';

interface PredictPositionEmptyProps {}

const PredictPositionEmpty: React.FC<PredictPositionEmptyProps> = () => {
  const tw = useTailwind();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const section = SECTIONS_CONFIG.predictions;

  const handleToggleEmptyState = useCallback((_isEmpty: boolean) => {
    // TODO: Toggle empty state
  }, []);

  const handleToggleLoadingState = useCallback((_isLoading: boolean) => {
    // TODO: Toggle loading state
  }, []);

  const handleHeaderPress = useCallback(() => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_FEATURED,
      },
    });
  }, [navigation]);

  return (
    <Box testID="predict-position-empty">
      <TouchableOpacity
        testID="predict-position-empty-section-header"
        style={tw.style('flex-row items-center mb-2')}
        onPress={handleHeaderPress}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
        >
          <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
            {strings('predict.category.trending')}
          </Text>
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
        </Box>
      </TouchableOpacity>
      <PredictEntryPointProvider
        entryPoint={PredictEventValues.ENTRY_POINT.HOMEPAGE_FEATURED}
      >
        <Section
          sectionId={section.id}
          refreshConfig={{ trigger: 0, silentRefresh: true }}
          toggleSectionEmptyState={handleToggleEmptyState}
          toggleSectionLoadingState={handleToggleLoadingState}
        />
      </PredictEntryPointProvider>
    </Box>
  );
};

export default PredictPositionEmpty;
