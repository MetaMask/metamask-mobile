const {config} = require('../wdio.conf');

// Appium capabilities
config.capabilities = [
    {
        platformName: 'Android',
        noReset: true,
        fullReset: false,
        maxInstances: 1,
        deviceName: "Pixel 3 API 29",
        platformVersion: "10",
        app: "/Users/chriswilcox/projects/wdio/resources/ApiDemos-debug.apk",
        appPackage: "io.appium.android.apis",
        appActivity: ".view.TextFields",
        automationName: "UiAutomator2"
    }
];

config.cucumberOpts.tagExpression = '@androidApp'; // pass tag to run tests specific to android

exports.config = config;