const wdio = require("webdriverio");
const assert = require("assert");

const opts = {
    path: '/wd/hub',
    port: 4723,
    capabilities: {
        platformName: "Android",
        platformVersion: "10",
        deviceName: "Pixel 3 API 29",
        app: "/Users/chriswilcox/projects/wdio/resources/ApiDemos-debug.apk",
        // app: __dirname + "/projects/wdio/resources/ApiDemos-debug.apk",
        appPackage: "io.appium.android.apis",
        appActivity: ".view.TextFields",
        automationName: "UiAutomator2"
    }
};

async function main() {
    const client = await wdio.remote(opts);

    const field = await client.$("android.widget.EditText");
    await field.setValue("Hello World!");
    const value = await field.getText();
    assert.strictEqual(value, "Hello World!");
    await client.pause(10000);
    await client.deleteSession();
}

main();