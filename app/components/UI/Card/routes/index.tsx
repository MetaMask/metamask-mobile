import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../../constants/navigation/Routes';
import CardHome from '../Views/CardHome/CardHome';
import { CardSDKProvider } from '../sdk';
import CardWelcome from '../Views/CardWelcome/CardWelcome';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../locales/i18n';
import { StyleSheet, View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';

const Stack = createStackNavigator();

export const headerStyle = StyleSheet.create({
  icon: { marginHorizontal: 16 },
  title: { alignSelf: 'center' },
});

export const cardDefaultNavigationOptions = ({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}) => ({
  headerLeft: () => <View />,
  headerTitle: () => (
    <Text
      variant={TextVariant.HeadingSM}
      style={headerStyle.title}
      testID={'card-view-title'}
    >
      {strings('card.card')}
    </Text>
  ),
  headerRight: () => (
    <ButtonIcon
      style={headerStyle.icon}
      size={ButtonIconSizes.Lg}
      iconName={IconName.Close}
      onPress={() => navigation.goBack()}
    />
  ),
});

const CardRoutes = () => (
  <CardSDKProvider>
    <Stack.Navigator initialRouteName={Routes.CARD.HOME} headerMode="screen">
      <Stack.Screen
        name={Routes.CARD.HOME}
        component={CardHome}
        options={cardDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.WELCOME}
        component={CardWelcome}
        options={cardDefaultNavigationOptions}
      />
    </Stack.Navigator>
  </CardSDKProvider>
);

export default CardRoutes;
