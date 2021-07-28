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

const main = async () => {
	console.log(`🔎 Detected ${Object.keys(contractMetadata).length} count in ${SOURCE_JSON}`);
	const imagesPath = path.resolve(__dirname, `../${IMAGES_DIR}`);
	const imageModulesPath = path.join(imagesPath, IMAGES_MODULES);
	const packageJsonPath = path.join(imagesPath, PACKAGE_JSON);

	// Create images folder
	if (!fs.existsSync(imagesPath)) {
		fs.mkdirSync(imagesPath, { recursive: true });
	}
	const packageJsonContents = { name: 'images' };
	await fs.writeFileSync(imageModulesPath, '');

	// Generate images modules file
	await fs.appendFileSync(imageModulesPath, `// Generated file - Do not edit - This will auto generate on build`);
	await fs.appendFileSync(imageModulesPath, `\n/* eslint-disable no-dupe-keys */`);
	await fs.appendFileSync(imageModulesPath, `\n\nexport default {`);
	for (const address in contractMetadata) {
		const token = contractMetadata[address];
		await fs.appendFileSync(
			imageModulesPath,
			`\n  "${token.logo}": require("metamask/node_modules/@metamask/contract-metadata/images/${token.logo}"),`
		);
	}
	await fs.appendFileSync(imageModulesPath, '\n};\n');
	console.log(`✅ Images module generated at - ${imageModulesPath}`);

	// Generate package.json for absolute import
	await fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJsonContents, null, 2)}\n`);
	console.log(`✅ Package JSON generated at - ${packageJsonPath}`);

	// Notify of completion
	console.log(`✅ Finished generating static logo assets! 🎉🎉`);
};

main();
