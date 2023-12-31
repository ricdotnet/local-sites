#!/usr/bin/env node

import process from 'process';
import os from 'os';
import commander from 'commander';
import { Site } from './src/site';
import { Utils } from './src/utils';
import { Config } from './src/config';
import { Error } from './src/error';

const command: commander.Command = commander.createCommand();
command
  .version('1.0')
  .option('-d, --domain <domain>', 'Target domain for the certificate')
  .option('-p, --port <port>', 'Target port to proxy')
  .option('-s, --secure', 'Secure the domain with ssl')
  .option('--init [force]', 'Create a configuration file')
  .option('--an <authority>', 'Set an Authority Name')
  .option('--on <organisation>', 'Set an Organisation Name')
  .option('--cn <common>', 'Set a Common Name')
  .parse(process.argv);

const { domain, port, secure, init, an, on, cn } = command.opts();

(async () => {
  if (os.platform() === 'win32') {
    return console.error('Not available for windows yet. :-(');
  }

  const config = new Config();

  if (init) return config.createConfigFile(init);

  try {
    await config.importConfig();
  } catch (err: any) {
    console.error((err as Error).error());
    return;
  }

  const configFile = config.getConfigFile();
  if (!configFile) return;

  if (an || on || cn) {
    await config.updateConfig('an', an);
    await config.updateConfig('on', on);
    await config.updateConfig('cn', cn);
    return;
  }

  if (config.checkConfigFile()) {
    console.log('Config file is all valid.');
  } else return;

  if (!domain) return console.error('Enter a test domain using -d or --domain');
  if (!port) return console.error('Enter a port to proxy using -p or --port');

  console.log('Initiating site creation ...');

  const site = new Site(domain, port, secure);
  await site.createSite();

  await Utils.execp('sudo nginx -s reload');

  // Add to json db

  console.log('Finished site creation!');
})();
