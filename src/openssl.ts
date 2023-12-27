import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import process from 'process';
import { Config } from '../types';
import { Utils } from './utils';

export class OpenSSL {
  private readonly config: Config;
  private readonly DOMAIN: string;

  constructor(config: Config, domain: string) {
    this.config = config;
    this.DOMAIN = domain;
  }

  async createCA() {
    console.log('Creating Certificate Authority ...');

    let caKey = `${this.sslDir()}/${this.config.authority_name}.key`;
    let caPem = `${this.sslDir()}/${this.config.authority_name}.pem`;
    let caCert = `${this.sslDir()}/${this.config.authority_name}.crt`;

    if (process.env.NODE_ENV === 'development') {
      caKey = caKey.replace('.key', '__DEV__.key');
      caPem = caPem.replace('.pem', '__DEV__.pem');
      caCert = caCert.replace('.crt', '__DEV__.crt');
    }

    try {
      await fs.readdir(this.sslDir());
    } catch (err) {
      console.log('SSL Directory does not exist. Creating ...');
      await fs.mkdir(this.sslDir());
    }

    if (await this.caCertificateExists()) {
      console.log('CAKey and CAPem already exist. Skipping this step ...');
      return;
    }

    await Utils.execp(
      `openssl req -x509 -nodes -new -sha256 -days 1024 -newkey rsa:2048 -keyout ${caKey} -out ${caPem} -subj "/C=GB/O=${this.config.organisation_name}/CN=${this.config.common_name}"`,
    );
    await Utils.execp(`openssl x509 -outform pem -in ${caPem} -out ${caCert}`);

    console.log('Created Certificate Authority');
  }

  async generateCertificate() {
    console.log('Generating Certificate for', this.DOMAIN, '...');

    const opensslConf = await fs.readFile(
      path.join(__dirname, 'stubs', 'openssl.conf'),
    );
    const tempOpenSslConf = opensslConf
      .toString()
      .replace('{{DOMAIN}}', this.DOMAIN);
    const tempOpenSslConfPath = path.join(
      __dirname,
      'stubs',
      'temp-openssl.conf',
    );

    await fs.writeFile(tempOpenSslConfPath, tempOpenSslConf);

    const keyFN = `${this.sslDir()}/${this.DOMAIN}.key`;
    const csrFN = `${this.sslDir()}/${this.DOMAIN}.csr`;
    const crtFN = `${this.sslDir()}/${this.DOMAIN}.crt`;
    let caPem = `${this.sslDir()}/${this.config.authority_name}.pem`;
    let caKey = `${this.sslDir()}/${this.config.authority_name}.key`;

    if (process.env.NODE_ENV === 'development') {
      caKey = caKey.replace('.key', '__DEV__.key');
      caPem = caPem.replace('.pem', '__DEV__.pem');
    }

    await Utils.execp(
      `openssl req -new -nodes -newkey rsa:2048 -keyout ${keyFN} -out ${csrFN} -subj "/C=GB/O=${this.config.organisation_name}/CN=${this.config.common_name}"`,
    );
    await Utils.execp(
      `openssl x509 -req -sha256 -days 1024 -in ${csrFN} -CA ${caPem} -CAkey ${caKey} -CAcreateserial -extfile ${tempOpenSslConfPath} -out ${crtFN}`,
    );

    await fs.rm(path.join(__dirname, 'stubs', 'temp-openssl.conf'));

    console.log('Generated Certificate for', this.DOMAIN);

    return { crt: crtFN, key: keyFN };
  }

  private sslDir() {
    if (!this.config.ssl_dir || this.config.ssl_dir === '') {
      console.warn(
        'No ssl_dir property defined on config file. Using ~/.config/ssl',
      );
      return path.join(os.homedir(), '.config', 'ssl');
    }

    return this.config.ssl_dir;
  }

  private async caCertificateExists() {
    let caCertificateCommonPath = path.join(
      this.sslDir(),
      this.config.authority_name,
    );

    if (process.env.NODE_ENV === 'development') {
      caCertificateCommonPath += '__DEV__';
    }

    const keyExists = await Utils.fileExists(caCertificateCommonPath + '.key');
    const pemExists = await Utils.fileExists(caCertificateCommonPath + '.pem');

    return keyExists && pemExists;
  }
}
