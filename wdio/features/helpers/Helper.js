// eslint-disable-next-line no-unused-vars
/*  global $, driver */
class Helper {
    static async driverTimeout(timeout = 1500){
    const setTimeout = timeout;
    await driver.pause(setTimeout);
    }
  }
  export default Helper;
