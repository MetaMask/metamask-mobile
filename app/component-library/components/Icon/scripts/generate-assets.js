#!/usr/bin/env node
/* eslint-disable import/no-commonjs */
/* eslint-disable import/no-nodejs-modules */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const ASSETS_FOLDER = 'assets';
const GENERATED_ASSETS_FILE = 'Icon.assets.ts';
const TYPES_FILE = 'Icon.types.ts';
const ASSET_EXT = '.png';
const TYPES_CONTENT_TO_DETECT = '// DO NOT EDIT - Use generate-assets.js';

const main = async () => {
  const assetsFolderPath = path.join(__dirname, `../${ASSETS_FOLDER}`);
  const assetsModulePath = path.join(__dirname, `../${GENERATED_ASSETS_FILE}`);
  const typesFilePath = path.join(__dirname, `../${TYPES_FILE}`);

  const fileList = fs.readdirSync(assetsFolderPath);
  const assetFileList = fileList.filter(
    (fileName) => path.extname(fileName) === ASSET_EXT,
  );

  fs.writeFileSync(assetsModulePath, '');

  fs.appendFileSync(
    assetsModulePath,
    `/* eslint-disable import/prefer-default-export */\n/* eslint-disable import/no-commonjs */\n/* eslint-disable @typescript-eslint/no-require-imports */`,
  );

  fs.appendFileSync(
    assetsModulePath,
    `\n///////////////////////////////////////////////////////\n// This is a generated file\n// DO NOT EDIT - Use generate-assets.js\n///////////////////////////////////////////////////////`,
  );
  fs.appendFileSync(
    assetsModulePath,
    `\nimport { AssetByIconName, IconName } from './Icon.types';`,
  );

  fs.appendFileSync(
    assetsModulePath,
    `\n\n/**\n * Asset stored by icon name\n */`,
  );

  fs.appendFileSync(
    assetsModulePath,
    `\nexport const assetByIconName: AssetByIconName = {`,
  );

  assetFileList.forEach(async (fileName) => {
    const titlecaseAssetName = path
      .basename(fileName, ASSET_EXT)
      .split('-')
      .map(
        (section) =>
          `${section[0].toUpperCase()}${section.substring(1, section.length)}`,
      )
      .join('');
    fs.appendFileSync(
      assetsModulePath,
      `\n  [IconName.${titlecaseAssetName}]: require('./assets/${fileName}'),`,
    );
  });

  fs.appendFileSync(assetsModulePath, '\n};\n');

  let typesContentToWrite = '';
  const typesFileContent = fs.readFileSync(typesFilePath, {
    encoding: 'utf8',
  });
  const indexToRemove = typesFileContent.indexOf(TYPES_CONTENT_TO_DETECT);
  const baseTypesFileContent = typesFileContent.substring(0, indexToRemove);

  typesContentToWrite +=
    baseTypesFileContent +
    TYPES_CONTENT_TO_DETECT +
    `\n///////////////////////////////////////////////////////`;

  typesContentToWrite += '\n\n/**\n * Icon names\n */\nexport enum IconName {';

  assetFileList.forEach((fileName) => {
    const iconName = path
      .basename(fileName, ASSET_EXT)
      .split('-')
      .map(
        (section) =>
          `${section[0].toUpperCase()}${section.substring(1, section.length)}`,
      )
      .join('');
    typesContentToWrite += `\n  ${iconName} = '${iconName}',`;
  });

  typesContentToWrite += '\n}\n';

  fs.writeFileSync(typesFilePath, typesContentToWrite);

  // Notify of completion
  console.log(`✅ Finished assets file! 🎉🎉`);
};

main();
