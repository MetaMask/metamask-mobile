import SharedGroupPreferences from 'react-native-shared-group-preferences';

const group = 'group.io.metamask.MetaMask';

export async function setWidgetQR(widgetData: object) {
  try {
    // iOS
    console.log('setWidgetQR', widgetData);

    await SharedGroupPreferences.setItem('qrData', widgetData, group);
  } catch (error) {
    console.error('setWidgetQR TEST', { error });
  }
}

//TODO Need to add in the location where we can get this data
export async function setSendReceiveBalanceWidgetWidget(widgetData: string) {
  try {
    // iOS
    await SharedGroupPreferences.setItem('widgetKey', widgetData, group);
  } catch (error) {
    console.error('setBalanceWidget TEST', { error });
  }
}

//Will need to create a generic function to set Android & iOS
