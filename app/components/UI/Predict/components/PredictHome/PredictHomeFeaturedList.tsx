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
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../constants/eventNames';
import { PredictEntryPointProvider } from '../../contexts';
import { PredictNavigationParamList } from '../../types/navigation';
import { usePredictMarketData } from '../../hooks/usePredictMarketData';
import PredictMarketRowItem from '../PredictMarketRowItem';
import PredictHomeSkeleton from './PredictHomeSkeleton';

interface PredictHomeFeaturedListProps {
  testID?: string;
}

const PredictHomeFeaturedList: React.FC<PredictHomeFeaturedListProps> = ({
  testID = 'predict-home-featured-list',
}) => {
  const tw = useTailwind();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();

  const { marketData, isFetching } = usePredictMarketData({
    category: 'trending',
    pageSize: 6,
  });

  const handleHeaderPress = useCallback(() => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_FEATURED,
      },
    });
  }, [navigation]);

  if (isFetching && marketData.length === 0) {
    return (
      <Box testID={testID}>
        <TouchableOpacity
          testID="predict-home-featured-list-header"
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
        <PredictHomeSkeleton />
      </Box>
    );
  }

  if (marketData.length === 0) {
    return null;
  }

  return (
    <Box testID={testID}>
      <TouchableOpacity
        testID="predict-home-featured-list-header"
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
        {marketData.map((market) => (
          <PredictMarketRowItem
            key={market.id}
            market={market}
            entryPoint={PredictEventValues.ENTRY_POINT.HOMEPAGE_FEATURED}
          />
        ))}
      </PredictEntryPointProvider>
    </Box>
  );
};

export default PredictHomeFeaturedList;
