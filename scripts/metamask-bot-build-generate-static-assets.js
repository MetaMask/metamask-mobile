#!/usr/bin/env node
/* eslint-disable import/no-commonjs */
/* eslint-disable import/no-nodejs-modules */
/* eslint-disable no-console */
const contractMetadata = require('@metamask/contract-metadata');
const fs = require('fs');
const path = require('path');

const SOURCE_JSON = 'contract-map.json';
const IMAGES_DIR = 'app/images';
const IMAGES_MODULES = 'static-logos.js';
const PACKAGE_JSON = 'package.json';

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
  const imageModulesPath = path.join(imagesPath, IMAGES_MODULES);
  const packageJsonPath = path.join(imagesPath, PACKAGE_JSON);

  // Create images folder
  if (!fs.existsSync(imagesPath)) {
    fs.mkdirSync(imagesPath, { recursive: true });
  }
  const packageJsonContents = { name: 'images' };
  // Create image modules file
  await fs.writeFileSync(imageModulesPath, '');

  // Generate images modules file
  await fs.appendFileSync(
    imageModulesPath,
    `// Generated file - Do not edit - This will auto generate on build`,
  );
  await fs.appendFileSync(imageModulesPath, `\n/* eslint-disable */`);
  await fs.appendFileSync(imageModulesPath, `\n\nexport default {`);
  for (let i = 0; i < cmKeys.length; i++) {
    const address = cmKeys[i];
    const token = contractMetadata[address];
    const isBlacklisted = blacklistedLogos[token.logo];
    await fs.appendFileSync(
      imageModulesPath,
      `\n  ${isBlacklisted ? '//' : ''}'${
        token.logo
      }': require('metamask/node_modules/@metamask/contract-metadata/images/${
        token.logo
      }'),`,
    );
  }
  await fs.appendFileSync(imageModulesPath, '\n};\n');
  console.log(`✅ Images module generated at - ${imageModulesPath}`);

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
