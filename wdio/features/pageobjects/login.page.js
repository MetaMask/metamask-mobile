// import wdio from 'webdriverio';
import Page from './page';
import { strictEqual } from 'assert';

/**
 * sub page containing specific selectors and methods for a specific page
 */
class DemoPage extends Page {
  /**
   * define selectors using getter methods
   */
  get inputField() {
    return driver.$('android.widget.EditText');
  }
  get inputPassword() {
    return $('#password');
  }
  get btnSubmit() {
    return $('button[type="submit"]');
  }

  /**
   * a method to encapsule automation code to interact with the page
   * e.g. to login using username and password
   */
  async setmessage(input) {
    await this.inputField.setValue(input);
  }

  /**
   * overwrite specific options to adapt it to page object
   */
  open() {
    return super.open('login');
  }

  launchApp() {}

  async verifymessage(message) {
    const value = await this.inputField.getText();
    strictEqual(value, message);
    await driver.pause(2000);
    await this.inputField.clearValue();
    await driver.pause(4000);
  }
}

export default new DemoPage();
