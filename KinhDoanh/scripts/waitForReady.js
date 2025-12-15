const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '..', 'temp_env.txt');
const EXPECTED = '✅ Server environment logged to temp_env.txt';
const INTERVAL = 500;
const TIMEOUT = 60000;

async function existsAndContains() {
  try {
    const content = await fs.promises.readFile(FILE, 'utf8');
    return content.indexOf(EXPECTED) !== -1;
  } catch (err) {
    return false;
  }
}

async function waitForReady() {
  const start = Date.now();
  while (Date.now() - start < TIMEOUT) {
    const ok = await existsAndContains();
    if (ok) {
      console.log('Ready signal found in temp_env.txt');
      process.exit(0);
    }
    await new Promise((r) => setTimeout(r, INTERVAL));
  }
  console.error('Timed out waiting for temp_env.txt readiness signal');
  process.exit(1);
}

waitForReady();
