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

async function setBalanceWidgetValue(name: string, value: string) {
  try {
    if (Platform.OS === 'ios') {
      try {
        // iOS
        await SharedGroupPreferences.setItem('DATA', { [name]: value }, group);
      } catch (error) {
        console.error({ error });
      }
    } else {
      // Android
      SharedStorage.set(name, value);
    }
  } catch (error) {
    console.error('setBalanceWidget', { error });
  }
}

export async function setBalanceWidgetBalance(balance: string) {
  setBalanceWidgetValue('balance', balance);
}

export async function setBalanceWidgetAccountName(name: string) {
  setBalanceWidgetValue('accountName', name);
}
