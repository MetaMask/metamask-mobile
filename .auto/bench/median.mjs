#!/usr/bin/env node
// Median of each METRIC across Hermes runs. Does not invent SELF_CHECK.
import fs from 'node:fs';

const files = process.argv.slice(2);
if (files.length === 0) {
  throw new Error('usage: median.mjs <run1.out> [<run2.out> ...]');
}

const order = [];
const perRun = files.map((file) => {
  const metrics = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = /^METRIC (\w+)=(.*)$/.exec(line);
    if (!match) continue;
    const [, name, raw] = match;
    if (!order.includes(name)) order.push(name);
    const value = Number(raw);
    if (!Number.isNaN(value)) metrics[name] = value;
  }
  return metrics;
});

for (const name of order) {
  const values = perRun.map((metrics) => metrics[name]).filter((value) => value !== undefined);
  if (values.length === 0) continue;
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[(sorted.length - 1) >> 1];
  const rounded = Math.round(median * 1000) / 1000;
  console.log(`METRIC ${name}=${rounded}`);
}
