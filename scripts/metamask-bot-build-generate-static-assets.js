#!/usr/bin/env node

const contractMetadata = require('@metamask/contract-metadata');
const fs = require('fs');
const path = require('path');

const SOURCE_JSON = 'contract-map.json';
const IMAGES_DIR = 'app/images';
const DS_IMAGES_DIR = 'app/component-library/components/CryptoLogo';
const IMAGES_MODULES = 'static-logos.js';
const DS_IMAGES_MODULES = 'CryptoLogo.assets.ts';
const PACKAGE_JSON = 'package.json';
const TYPES_CONTENT_TO_DETECT = '// DO NOT EDIT';
const TYPES_FILE = 'CryptoLogo.types.ts';

const blacklistedLogos = {
  'DG.svg': true,
  'c20.svg': true,
  'loom.svg': true,
  'USDx.svg': true,
};

const main = async () => {
  const cmKeys = Object.keys(contractMetadata);
  const numberOfAssets = cmKeys.length;
  console.log(`🔎 Detected ${numberOfAssets} count in ${SOURCE_JSON}`);
  const imagesPath = path.resolve(__dirname, `../${IMAGES_DIR}`);
  const dsImagesPath = path.resolve(__dirname, `../${DS_IMAGES_DIR}`);
  const imageModulesPath = path.join(imagesPath, IMAGES_MODULES);
  const dsImageModulesPath = path.join(dsImagesPath, DS_IMAGES_MODULES);
  const packageJsonPath = path.join(imagesPath, PACKAGE_JSON);
  const typesFilePath = path.join(dsImagesPath, `${TYPES_FILE}`);

  // Create images folder
  if (!fs.existsSync(imagesPath)) {
    fs.mkdirSync(imagesPath, { recursive: true });
  }
  if (!fs.existsSync(dsImagesPath)) {
    fs.mkdirSync(dsImagesPath, { recursive: true });
  }
  if (!fs.existsSync(typesFilePath)) {
    fs.mkdirSync(typesFilePath, { recursive: true });
  }
  const packageJsonContents = { name: 'images' };
  // Create image modules file
  await fs.writeFileSync(imageModulesPath, '');
  await fs.writeFileSync(dsImageModulesPath, '');

  // Generate images modules file
  await fs.appendFileSync(
    imageModulesPath,
    `// Generated file - Do not edit - This will auto generate on build`,
  );
  await fs.appendFileSync(
    dsImageModulesPath,
    `// Generated file - Do not edit - This will auto generate on build`,
  );
  await fs.appendFileSync(imageModulesPath, `\n/* eslint-disable */`);
  await fs.appendFileSync(dsImageModulesPath, `\n/* eslint-disable */`);
  await fs.appendFileSync(
    dsImageModulesPath,
    `\nimport { AssetByCryptoLogoName, CryptoLogoName } from './CryptoLogo.types';`,
  );
  await fs.appendFileSync(imageModulesPath, `\n\nexport default {`);
  await fs.appendFileSync(dsImageModulesPath, `\n\nexport const assetByCryptoLogoName: AssetByCryptoLogoName = {`);

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

  typesContentToWrite += '\n\n/**\n * CryptoLogo names\n */\nexport enum CryptoLogoName {';
  const logoList = [];

  for (let i = 0; i < cmKeys.length; i++) {
    const address = cmKeys[i];
    const token = contractMetadata[address];
    const isBlacklisted = blacklistedLogos[token.logo];
    const logoName = token.logo.replace(/\.[^/.]+$/, '');

    if (logoList.indexOf(logoName) === -1) {
      await fs.appendFileSync(
        imageModulesPath,
        `\n  ${isBlacklisted ? '//' : ''}'${
          token.logo
        }': require('metamask/node_modules/@metamask/contract-metadata/images/${
          token.logo
        }'),`,
      );
      await fs.appendFileSync(
        dsImageModulesPath,
        `\n  ${isBlacklisted ? '//' : ''}[CryptoLogoName['${
          logoName
        }']]: require('metamask/node_modules/@metamask/contract-metadata/images/${
          token.logo
        }'),`,
      );
      if (!isBlacklisted) {
        typesContentToWrite += `\n  '${logoName}' = '${logoName}',`;
      }
      logoList.push(logoName);
    }
  }

  typesContentToWrite += '\n}\n';
  await fs.writeFileSync(typesFilePath, typesContentToWrite);
  await fs.appendFileSync(imageModulesPath, '\n};\n');
  console.log(`✅ Images module generated at - ${imageModulesPath}`);
  await fs.appendFileSync(dsImageModulesPath, '\n};\n');
  console.log(`✅ Images module generated at - ${dsImageModulesPath}`);

  // Generate package.json for absolute import
  await fs.writeFileSync(
    packageJsonPath,
    `${JSON.stringify(packageJsonContents, null, 2)}\n`,
  );
  console.log(`✅ Package JSON generated at - ${packageJsonPath}`);

  // Notify of completion
  console.log(`✅ Finished generating static logo assets! 🎉🎉`);
};

main();
