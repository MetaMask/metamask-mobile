import { NativeModules, Platform } from 'react-native';
import SharedGroupPreferences from 'react-native-shared-group-preferences';

const group = 'group.io.metamask.MetaMask';

const SharedStorage = NativeModules.SharedStorage;

export async function setWidgetQR(widgetData: object) {
  try {
    // iOS
    console.log('setWidgetQR', widgetData);

    await SharedGroupPreferences.setItem('qrData', widgetData, group);
  } catch (error) {
    console.error('setWidgetQR TEST', { error });
  }
}

export async function setBalanceWidgetBalanceValue(balance: string) {
  try {
    if (Platform.OS === 'ios') {
      try {
        // iOS
        await SharedGroupPreferences.setItem('DATA', { balance }, group);
      } catch (error) {
        console.error({ error });
      }
    } else {
      // Android
      SharedStorage.set(JSON.stringify({ balance }));
    }
  } catch (error) {
    console.error('setBalanceWidget', { error });
  }
}

//Will need to create a generic function to set Android & iOS
