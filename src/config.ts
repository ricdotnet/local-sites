import path from 'path';
import os from 'os';
import { Utils } from './utils';
import { ConfigFile } from '../types';
import { Error } from './error';

export class Config {
  private static _instance: Config;
  private configFile: ConfigFile | undefined;

  constructor() {
    if (Config._instance !== undefined) {
      console.log('Config was already initiated.');
    }

    Config._instance = this;
  }

  static instance(): Config {
    return Config._instance;
  }

  async importConfig(): Promise<void | ConfigFile> {
    try {
      const importedConfig = (await import(
        path.join(os.homedir(), '.config', 'localsites', this.configFileName())
      )) as ConfigFile;
      this.configFile = {
        authority_name: importedConfig.authority_name,
        common_name: importedConfig.common_name,
        nginx_dir: importedConfig.nginx_dir,
        organisation_name: importedConfig.organisation_name,
        ssl_dir: importedConfig.ssl_dir,
      };
    } catch (_) {
      throw new Error('You need to create a config file. Use localsite --init');
    }
  }

  getConfigFile(): ConfigFile {
    if (!this.configFile) {
      throw new Error('Config file does not exist.');
    }
    return this.configFile;
  }

  async createConfigFile(force: string | boolean): Promise<void> {
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
        path.join(os.homedir(), '.config', 'localsites', this.configFileName()),
      )) &&
      force !== 'force'
    ) {
      return console.warn(
        'A config file already exists. Use "--init force" if you want to rewrite the current config file.',
      );
    }

    const configPath = Utils.isDevMode()
      ? path.join(__dirname, 'stubs', 'localsites.config.json')
      : path.join(__dirname, 'src', 'stubs', 'localsites.config.json');
    let configStub = await Utils.readFile(configPath);

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

    const configFileName = Utils.isDevMode()
      ? 'dev.localsites.config.json'
      : 'localsites.config.json';
    await Utils.createFile(
      path.join(os.homedir(), '.config', 'localsites', configFileName),
      configStub,
    );

    console.log('Config file created');
  }

  checkConfigFile(): boolean {
    const invalidAN = this.configFile!.authority_name === '{{CONFIG_AN}}';
    const invalidON = this.configFile!.organisation_name === '{{CONFIG_ON}}';
    const invalidCN = this.configFile!.common_name === '{{CONFIG_CN}}';

    if (invalidAN) {
      console.warn('Use --an "<authority name>" to set an authority name.');
    }
    if (invalidON) {
      console.warn(
        'Use --on "<organisation name>" to set an organisation name.',
      );
    }
    if (invalidCN) {
      console.warn('Use --cn "<common name>" to set a common name.');
    }

    return !invalidAN && !invalidON && !invalidCN;
  }

  async updateConfig(key: 'an' | 'on' | 'cn', value: string): Promise<void> {
    if (!value) return;

    const configFilePath = path.join(
      os.homedir(),
      '.config',
      'localsites',
      this.configFileName(),
    );

    switch (key) {
      case 'an':
        this.configFile!.authority_name = value;
        break;
      case 'on':
        this.configFile!.organisation_name = value;
        break;
      case 'cn':
        this.configFile!.common_name = value;
        break;
    }

    await Utils.createFile(configFilePath, JSON.stringify(this.configFile));
  }

  private configFileName(): string {
    return Utils.isDevMode()
      ? 'dev.localsites.config.json'
      : 'localsites.config.json';
  }
}
