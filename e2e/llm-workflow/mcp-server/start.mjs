#!/usr/bin/env node
/* eslint-disable import/no-nodejs-modules */
import { existsSync } from 'fs';
import { readdir, stat } from 'fs/promises';
import { dirname, extname, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workflowRoot = resolve(__dirname, '..');
const buildScriptPath = resolve(__dirname, 'build.mjs');
const distServerPath = resolve(__dirname, 'dist/server.mjs');
const sourceExtensions = new Set(['.ts', '.mjs']);
const ignoredDirs = new Set(['dist', '__tests__']);

async function collectSourceFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = resolve(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        files.push(...(await collectSourceFiles(fullPath)));
      }
      continue;
    }

    if (sourceExtensions.has(extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

async function isBuildStale() {
  if (!existsSync(distServerPath)) {
    return true;
  }

  const distMtimeMs = (await stat(distServerPath)).mtimeMs;
  const sourceFiles = await collectSourceFiles(workflowRoot);

  for (const sourceFile of sourceFiles) {
    const sourceMtimeMs = (await stat(sourceFile)).mtimeMs;
    if (sourceMtimeMs > distMtimeMs) {
      return true;
    }
  }

  return false;
}

if (await isBuildStale()) {
  console.error('Building MCP server bundle...');
  await import(pathToFileURL(buildScriptPath).href);
}

await import(pathToFileURL(distServerPath).href);
