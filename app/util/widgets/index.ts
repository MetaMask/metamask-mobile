import { Hex, isStrictHexString, remove0x } from '@metamask/utils';
import SharedGroupPreferences from 'react-native-shared-group-preferences';

const group = 'group.io.metamask.MetaMask';

//TODO Need to add in the location where we can get this data
export async function setSmallBalanceWidget(widgetData: object) {
  try {
    // iOS
    console.log('widgetData', widgetData);

    await SharedGroupPreferences.setItem('widgetKey', widgetData, group);
  } catch (error) {
    console.log('setBalanceWidget TEST', { error });
  }
}

//TODO Need to add in the location where we can get this data
export async function setSendReceiveBalanceWidgetWidget(widgetData: string) {
  try {
    // iOS
    console.log('widgetData', widgetData);
    await SharedGroupPreferences.setItem('widgetKey', widgetData, group);
  } catch (error) {
    console.log('setBalanceWidget TEST', { error });
  }
}

//TODO Need to add in the location where we can get this data
export async function recentActivityWidget(widgetData: object) {
  try {
    // iOS
    console.log('widgetData', widgetData);
    await SharedGroupPreferences.setItem('widgetKey', widgetData, group);
  } catch (error) {
    console.log('setSendReceiveWidget TEST', { error });
  }
  // const value = `${text} days`;
  // Android
  // SharedStorage.set(JSON.stringify({ text: value }));
  // ToastAndroid.show('Change value successfully!', ToastAndroid.SHORT);
}

//Will need to create a generic function to set Android & iOS
