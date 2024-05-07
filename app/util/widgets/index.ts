import SharedGroupPreferences from 'react-native-shared-group-preferences';

const group = 'group.io.metamask.MetaMask';

//Need to add in the location where we can get this data
export async function setSmallBalanceWidget(widgetData: object) {
  try {
    // iOS
    console.log('widgetData', widgetData);
    await SharedGroupPreferences.setItem('widgetKey', widgetData, group);
  } catch (error) {
    console.log('setBalanceWidget TEST', { error });
  }
}

//Need to add in the location where we can get this data
export async function setSendRecieveBalanceWidgetWidget(widgetData: object) {
  try {
    // iOS
    console.log('widgetData', widgetData);
    await SharedGroupPreferences.setItem('widgetKey', widgetData, group);
  } catch (error) {
    console.log('setBalanceWidget TEST', { error });
  }
}

//Need to add in the location where we can get this data
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
