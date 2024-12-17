import { take } from 'redux-saga/effects';
import { BrowserActionTypes } from '../../../actions/browser';
/**
 * Handles the state machine for the browser
 */
export function* browserStateMachine() {
  while (true) {
    yield take(BrowserActionTypes.SET_BROWSER_LOAD_START);
    console.log('BROWSER: BROWSER LOAD START');
    yield take(BrowserActionTypes.SET_BROWSER_LOAD_END);
    console.log('BROWSER: BROWSER LOAD END');
  }
}
