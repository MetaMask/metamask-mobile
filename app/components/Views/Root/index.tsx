import { View, Text, Button } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import createNativeStackNavigator from './react-native-cool-modals/createNativeStackNavigator';
import Skia from './skia';
import ThreeJS from './three-js';

const NativeStack = createNativeStackNavigator();

function Empty() {
  return <View style={{ flex: 1 }} />;
}

function Home() {
  const navigation = useNavigation();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button
        title={'Skia Example'}
        onPress={() => navigation.navigate('Skia')}
      />
      <Button
        title={'ThreeJS Example'}
        onPress={() => navigation.navigate('ThreeJS')}
      />
      <Button
        title={'Empty Example'}
        onPress={() => navigation.navigate('Empty')}
      />
    </View>
  );
}

const buildCoolModalConfig = (params: any) => ({
  allowsDragToDismiss: true,
  allowsTapToDismiss: true,
  backgroundColor: 'blue',
  backgroundOpacity: params.backgroundOpacity || 0.7,
  blocksBackgroundTouches: true,
  cornerRadius: params.cornerRadius || 39,
  customStack: true,
  disableShortFormAfterTransitionToLongForm:
    params.disableShortFormAfterTransitionToLongForm ||
    params?.type === 'token' ||
    params?.type === 'uniswap',
  gestureEnabled: true,
  headerHeight: params.headerHeight || 25,
  ignoreBottomOffset: true,
  isShortFormEnabled: params.isShortFormEnabled || params?.type === 'token',
  longFormHeight: params.longFormHeight,
  onAppear: params.onAppear || null,
  scrollEnabled: params.scrollEnabled,
  single: params.single,
  springDamping: params.springDamping || 0.8,
  startFromShortForm:
    params.startFromShortForm || params?.type === 'token' || false,
  topOffset: 0,
  transitionDuration: params.transitionDuration || 0.35,
});

export const expandedAssetSheetConfigWithLimit = {
  options: ({ route: { params = {} } }) => ({
    ...buildCoolModalConfig({
      ...params,
      scrollEnabled: true,
    }),
    limitActiveModals: true,
  }),
};

const Root = () => {
  return (
    <NavigationContainer>
      <NativeStack.Navigator screenOptions={{}}>
        <NativeStack.Screen name="Home" component={Home} />
        <NativeStack.Screen name="Skia" component={Skia} />
        <NativeStack.Screen name="ThreeJS" component={ThreeJS} />
        <NativeStack.Screen
          name="Empty"
          component={Empty}
          options={{ presentation: 'modal' }}
        />
      </NativeStack.Navigator>
    </NavigationContainer>
  );
};

export default Root;
