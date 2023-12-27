#!/usr/bin/env node

import process from 'process';
import path from 'path';
import os from 'os';
import commander from 'commander';
import { Site } from './src/site';
import { Utils } from './src/utils';
import { Config } from './types';

const devMode = process.env.NODE_ENV === 'development';

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

  if (init) return createConfigFile(init);

  const config = await importConfig();
  if (!config) return;

  if (an || on || cn) {
    await updateConfig('an', an);
    await updateConfig('on', on);
    await updateConfig('cn', cn);
    return;
  }

  if (checkConfigFile(config)) {
    console.log('Config file is all valid.');
  } else return;

  if (!domain) return console.error('Enter a test domain using -d or --domain');
  if (!port) return console.error('Enter a port to proxy using -p or --port');

  console.log('Initiating site creation ...');

  const site = new Site(config, domain, port, secure);
  await site.createSite();

  await Utils.execp('sudo nginx -s reload');

  console.log('Finished site creation!');
})();

// TODO: move all config related stuff to Config.ts
async function importConfig(): Promise<void | Config> {
  const configFile = devMode
    ? 'dev.localsites.config.json'
    : 'localsites.config.json';
  try {
    return await import(
      path.join(os.homedir(), '.config', 'localsites', configFile)
    );
  } catch (_) {
    return console.error(
      'You need to create a config file. Use localsite --init',
    );
  }
}

async function createConfigFile(force: string | boolean) {
  if (
    !(await Utils.dirExists(path.join(os.homedir(), '.config', 'localsites')))
  ) {
    await Utils.createDir(path.join(os.homedir(), '.config', 'localsites'));
    await Utils.createDir(
      path.join(os.homedir(), '.config', 'localsites', 'ssl'),
    );
    await Utils.createDir(
      path.join(os.homedir(), '.config', 'localsites', 'nginx'),
    );
  } else {
    console.warn(
      'A localsites dir already exists in your "~/.config" directory.',
    );
  }

  if (
    (await Utils.fileExists(
      path.join(
        os.homedir(),
        '.config',
        'localsites',
        'localsites.config.json',
      ),
    )) &&
    force !== 'force'
  ) {
    return console.warn(
      'A config file already exists. Use "--init force" if you want to rewrite the current config file.',
    );
  }

  let configStub = await Utils.readFile(
    path.join(__dirname, 'src', 'stubs', 'localsites.config.json'),
  );

  console.log('Creating config file');

  configStub = configStub
    .replace(
      '{{SSL_DIR}}',
      path.join(os.homedir(), '.config', 'localsites', 'ssl'),
    )
    .replace(
      '{{NGINX_DIR}}',
      path.join(os.homedir(), '.config', 'localsites', 'nginx'),
    );

  const configFileName = devMode
    ? 'dev.localsites.config.json'
    : 'localsites.config.json';
  await Utils.createFile(
    path.join(os.homedir(), '.config', 'localsites', configFileName),
    configStub,
  );

  console.log('Config file created');
}

function checkConfigFile(config: Config): boolean {
  const invalidAN = config.authority_name === '{{CONFIG_AN}}';
  const invalidON = config.organisation_name === '{{CONFIG_ON}}';
  const invalidCN = config.common_name === '{{CONFIG_CN}}';

  if (invalidAN) {
    console.warn('Use --an "<authority name>" to set an authority name.');
  }
  if (invalidON) {
    console.warn('Use --on "<organisation name>" to set an organisation name.');
  }
  if (invalidCN) {
    console.warn('Use --cn "<common name>" to set a common name.');
  }

  return !invalidAN && !invalidON && !invalidCN;
}

// TODO: replace this with import and change by key then write....
// The way it is now will not allow for rewrite after setting the names for the first time
async function updateConfig(
  key: 'an' | 'on' | 'cn',
  value: string,
): Promise<void> {
  if (!value) return;

  const fileName = devMode
    ? 'dev.localsites.config.json'
    : 'localsites.config.json';
  const configFilePath = path.join(
    os.homedir(),
    '.config',
    'localsites',
    fileName,
  );
  let config = await Utils.readFile(configFilePath);

  switch (key) {
    case 'an':
      config = config.replace('{{CONFIG_AN}}', value);
      break;
    case 'on':
      config = config.replace('{{CONFIG_ON}}', value);
      break;
    case 'cn':
      config = config.replace('{{CONFIG_CN}}', value);
      break;
  }

  await Utils.createFile(configFilePath, config);
}
