# Toast

Toast is a generic component to show temporary or dismissable messages to the user, it's a wrapper around [react-native-toast-message](https://github.com/calintamas/react-native-toast-message).

## Props

This component doesn't receive any props directly because it's intented to be triggered through a function call.

## Toast.showWarningToast

### `title`

The text to display in the toast title.

| <span style="color:gray;font-size:14px">TYPE</span>    | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :----------------------------------------------------- | :------------------------------------------------------ |
| string | Yes                                                     | 

### `message`

The text to display in the toast body.

| <span style="color:gray;font-size:14px">TYPE</span>    | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :----------------------------------------------------- | :------------------------------------------------------ |
| string | Yes                                                     | 

### `action`

The function to call when the action link is pressed.

| <span style="color:gray;font-size:14px">TYPE</span>    | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :----------------------------------------------------- | :------------------------------------------------------ |
| string | Yes                                                     | 

### `actionText`

The text to display in the action link.

| <span style="color:gray;font-size:14px">TYPE</span>    | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :----------------------------------------------------- | :------------------------------------------------------ |
| string | Yes                                                     | 

## Usage

```javascript
import Toast from '../../../component-library/components/Toast';

Toast.showWarningToast({
  title: 'Security Warning',
  message:
    'Your Android System Webview is out of date and may leave you open to security risks.',
  actionText: 'Update on Play Store',
  action: () => console.log('LOG'),
});
```
