#!/usr/bin/env node

import process from "process";
import path from "path";
import commander from 'commander';
import { Site } from "./src/site";
import { Utils } from "./src/utils";
const devMode = process.env.NODE_ENV === 'development';

const command: commander.Command = commander.createCommand();
command
  .version('1.0')
  .option('-d, --domain <domain>', 'Target domain for the certificate')
  .option('-p, --port <port>', 'Target port to proxy')
  .option('-s, --secure', 'Secure the domain with ssl')
  .option('--init', 'Create a configuration file')
  .parse(process.argv);

const { domain, port, secure, init } = command.opts();

(async () => {
  if (init) return createConfigFile();

  const config = await importConfig();
  if (!config) return;

  if (!domain) return console.error('Enter a test domain using -d or --domain');
  if (!port) return console.error('Enter a port to proxy using -p or --port');

  console.log('Initiating site creation ...');

  const site = new Site(config, domain, port, secure);
  await site.createSite();

  await Utils.execp('sudo nginx -s reload');

  console.log('Finished site creation!');
})();

async function importConfig() {
  const configFile = devMode
    ? path.join(__dirname, 'dev.lc.config.json')
    : path.join(__dirname, '..', 'lc.config.json');
  try {
    return await import(configFile);
  } catch (_) {
    return console.error('You need to create a config file. Use localsite --init');
  }
}

async function createConfigFile() {
  if (await Utils.fileExists(path.join(__dirname, 'lc.config.json'))) {
    return console.warn('A config file already exists.');
  }

  const configStub = await Utils.readFile(path.join(__dirname, 'src', 'stubs', 'lc.config.json'));
  await Utils.createFile(path.join(__dirname, 'lc.config.json'), configStub);

  console.log('Config file created');
}
