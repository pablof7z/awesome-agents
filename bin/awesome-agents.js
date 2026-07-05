#!/usr/bin/env node

import { run } from "../src/cli.js";

run(process.argv).catch((error) => {
  const message = error && error.message ? error.message : String(error);
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
});
