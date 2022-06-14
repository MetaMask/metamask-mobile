#!/usr/bin/env node
/* eslint-disable import/no-commonjs */
/* eslint-disable import/no-nodejs-modules */
/* eslint-disable no-console */
const { exec } = require('child_process');
const endpoint = 'https://api-cloud.browserstack.com/app-live/upload';
const file = './android/app/build/outputs/apk/debug/app-debug.apk';

const BROWSERSTACK_USERNAME = process.env.MM_BROWSERSTACK_USERNAME;
const BROWSERSTACK_ACCESS_KEY = process.env.MM_BROWSERSTACK_ACCESS_KEY;
const APK_LOCATION = process.env.MM_APK_LOCATION;

if (!BROWSERSTACK_USERNAME || !BROWSERSTACK_ACCESS_KEY) {
  console.log(
    `You must provide BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY`,
  );
  process.exit();
}

async function upload() {
  await new Promise((resolve, reject) => {
    exec(
      `curl -u "${BROWSERSTACK_USERNAME}:${BROWSERSTACK_ACCESS_KEY}" -X POST "${endpoint}" -F "file=@${
        file || APK_LOCATION
      }"`,
      (error, stdout, stderr) => {
        if (error) reject(new Error(error));
        console.log({ stdout });
        resolve();
      },
    );
  });
}

upload();
