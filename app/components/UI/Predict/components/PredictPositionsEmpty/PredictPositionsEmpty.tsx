import {
  StackActions,
  type NavigationProp,
  useNavigation,
} from '@react-navigation/native';
import React, { useCallback } from 'react';
import {
  Box,
  Button,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  Theme,
  useTailwind,
  useTheme as useDesignSystemTheme,
} from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import PredictionsEmptyDarkIcon from '../../../../../images/predictions-dark.svg';
import PredictionsEmptyLightIcon from '../../../../../images/predictions-light.svg';
import { PredictPositionsEmptySelectorsIDs } from '../../Predict.testIds';
import type { PredictNavigationParamList } from '../../types/navigation';

interface PredictPositionsEmptyProps {
  testID?: string;
}

const PredictPositionsEmpty = ({
  testID = PredictPositionsEmptySelectorsIDs.CONTAINER,
}: PredictPositionsEmptyProps) => {
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const tw = useTailwind();
  const designSystemTheme = useDesignSystemTheme();
  const EmptyIcon =
    designSystemTheme === Theme.Dark
      ? PredictionsEmptyDarkIcon
      : PredictionsEmptyLightIcon;

  const handleBrowseMarketsPress = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.dispatch(StackActions.popToTop());
      return;
    }

    navigation.navigate(Routes.PREDICT.MARKET_LIST);
  }, [navigation]);

  return (
    <Box
      testID={testID}
      style={tw.style('flex-1 items-center justify-center px-8 py-10')}
    >
      <Box
        testID={PredictPositionsEmptySelectorsIDs.ICON}
        style={tw.style('mb-4 h-[72px] w-[72px] items-center justify-center')}
      >
        <EmptyIcon width={72} height={72} />
      </Box>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        testID={PredictPositionsEmptySelectorsIDs.DESCRIPTION}
        style={tw.style('mb-4 max-w-[220px] text-center')}
      >
        {strings('predict.positions_empty.description')}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        onPress={handleBrowseMarketsPress}
        testID={PredictPositionsEmptySelectorsIDs.BROWSE_MARKETS_CTA}
        twClassName="self-center"
      >
        {strings('predict.positions_empty.browse_markets')}
      </Button>
    </Box>
  );
};

export default PredictPositionsEmpty;
