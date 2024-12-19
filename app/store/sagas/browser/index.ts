import { take } from 'redux-saga/effects';
import {
  BrowserActionTypes,
  BrowserLoadEndAction,
  BrowserLoadStartAction,
} from '../../../actions/browser';
/**
 * Handles the state machine for the browser
 */
export function* browserStateMachine() {
  while (true) {
    const {
      payload: { url: loadStartUrl },
    }: BrowserLoadStartAction = yield take(
      BrowserActionTypes.SET_BROWSER_LOAD_START,
    );
    console.log('BROWSER: BROWSER LOAD START', loadStartUrl);
    const {
      payload: { url: loadEndUrl },
    }: BrowserLoadEndAction = yield take(
      BrowserActionTypes.SET_BROWSER_LOAD_END,
    );
    console.log('BROWSER: BROWSER LOAD END', loadEndUrl);
  }
}
