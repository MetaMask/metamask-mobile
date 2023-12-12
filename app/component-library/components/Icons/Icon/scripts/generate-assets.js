#!/usr/bin/env node
/* eslint-disable import/no-commonjs, import/no-nodejs-modules, import/no-nodejs-modules, no-console */
const fs = require('fs');
const path = require('path');

const ASSETS_FOLDER = 'assets';
const GENERATED_ASSETS_FILE = 'Icon.assets.ts';
const TYPES_FILE = 'Icon.types.ts';
const ASSET_EXT = '.svg';
const TYPES_CONTENT_TO_DETECT = '// DO NOT EDIT - Use generate-assets.js';

const getIconNameInTitleCase = (fileName) =>
  path
    .basename(fileName, ASSET_EXT)
    .split('-')
    .map(
      (section) =>
        `${section[0].toUpperCase()}${section.substring(1, section.length)}`,
    )
    .join('');

const main = async () => {
  const assetsFolderPath = path.join(__dirname, `../${ASSETS_FOLDER}`);
  const assetsModulePath = path.join(__dirname, `../${GENERATED_ASSETS_FILE}`);
  const typesFilePath = path.join(__dirname, `../${TYPES_FILE}`);

  const fileList = fs.readdirSync(assetsFolderPath);
  const assetFileList = fileList.filter(
    (fileName) => path.extname(fileName) === ASSET_EXT,
  );

  // Replace the color black with currentColor
  assetFileList.forEach((fileName) => {
    const filePath = path.join(__dirname, `../${ASSETS_FOLDER}/${fileName}`);
    const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
    const formattedFileContent = fileContent.replace(/black/g, 'currentColor');
    fs.writeFileSync(filePath, formattedFileContent);
  });

  fs.writeFileSync(assetsModulePath, '');

  fs.appendFileSync(
    assetsModulePath,
    `/* eslint-disable import/prefer-default-export */`,
  );

  fs.appendFileSync(
    assetsModulePath,
    `\n///////////////////////////////////////////////////////\n// This is a generated file\n// DO NOT EDIT - Use generate-assets.js\n///////////////////////////////////////////////////////`,
  );
  fs.appendFileSync(
    assetsModulePath,
    `\nimport { AssetByIconName, IconName } from './Icon.types';`,
  );

  assetFileList.forEach((fileName) => {
    const iconName = getIconNameInTitleCase(fileName);
    fs.appendFileSync(
      assetsModulePath,
      `\nimport ${iconName} from './assets/${fileName}';`,
    );
  });

  fs.appendFileSync(
    assetsModulePath,
    `\n\n/**\n * Asset stored by icon name\n */`,
  );

  fs.appendFileSync(
    assetsModulePath,
    `\nexport const assetByIconName: AssetByIconName = {`,
  );

  assetFileList.forEach(async (fileName) => {
    const iconName = getIconNameInTitleCase(fileName);
    fs.appendFileSync(
      assetsModulePath,
      `\n  [IconName.${iconName}]: ${iconName},`,
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
