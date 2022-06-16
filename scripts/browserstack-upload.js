#!/usr/bin/env node
/* eslint-disable import/no-commonjs */
/* eslint-disable import/no-nodejs-modules */
/* eslint-disable no-console */
const { exec } = require('child_process');
const endpoint = 'https://api-cloud.browserstack.com/app-live/upload';
const debugApk = './android/app/build/outputs/apk/debug/app-debug.apk';

const {
  BROWSERSTACK_USERNAME,
  BROWSERSTACK_ACCESS_KEY,
  BROWSERSTACK_APK_LOCATION,
} = require('rc')('metamask', {
  BROWSERSTACK_USERNAME: process.env.BROWSERSTACK_USERNAME,
  BROWSERSTACK_ACCESS_KEY: process.env.BROWSERSTACK_ACCESS_KEY,
  BROWSERSTACK_APK_LOCATION: process.env.BROWSERSTACK_APK_LOCATION,
});

const file = BROWSERSTACK_APK_LOCATION || debugApk;
const writeDot = () => process.stdout.write('.');

if (!BROWSERSTACK_USERNAME.length || !BROWSERSTACK_ACCESS_KEY.length) {
  console.log(
    `You must provide BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY`,
  );
  process.exit();
}

async function upload() {
  await new Promise((resolve, reject) => {
    console.log(`uploading ${file} to browserstack`);
    const interval = setInterval(writeDot, 1000);
    exec(
      `curl -u "${BROWSERSTACK_USERNAME}:${BROWSERSTACK_ACCESS_KEY}" -X POST "${endpoint}" -F "file=@${file}"`,
      (error, stdout, stderr) => {
        if (error) reject(new Error(error));
        clearInterval(interval);
        console.log('upload complete!');
        console.log({ stdout });
        resolve();
      },
    );
  });
}

upload();
