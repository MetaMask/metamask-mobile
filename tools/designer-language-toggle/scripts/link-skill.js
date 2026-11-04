#!/usr/bin/env node
/**
 * Link this folder into the skill directories Replit Agent and Cursor read.
 * Those directories are gitignored in this repo, so the link stays local.
 *
 * node tools/designer-language-toggle/scripts/link-skill.js
 */
const fs = require('fs');
const path = require('path');
const lib = require('./locale-lib');

function main() {
  const args = lib.parseArgs(process.argv.slice(2));
  const root = lib.findRepoRoot(args.root);
  const skillDir = path.join(root, 'tools', 'designer-language-toggle');
  const skillFile = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillFile)) {
    throw new Error(`Missing ${skillFile}`);
  }

  const targets = [
    path.join(root, '.agents', 'skills'),
    path.join(root, '.cursor', 'skills'),
  ];
  targets.forEach((dir) => {
    fs.mkdirSync(dir, { recursive: true });
    const link = path.join(dir, 'designer-language-toggle');
    const relative = path.relative(dir, skillDir);
    if (fs.existsSync(link)) {
      const stat = fs.lstatSync(link);
      if (stat.isSymbolicLink() && fs.readlinkSync(link) === relative) {
        console.log(`Already linked: ${path.relative(root, link)} -> ${relative}`);
        return;
      }
      throw new Error(
        `${link} already exists and is not the expected link. Move it aside and run this again.`,
      );
    }
    fs.symlinkSync(relative, link);
    console.log(`Linked ${path.relative(root, link)} -> ${relative}`);
  });
  console.log('');
  console.log(
    'Start a new Agent chat so it sees the skill. The links are gitignored. The tracked copy stays in tools/designer-language-toggle/.',
  );
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
