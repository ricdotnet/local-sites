import fs from "fs/promises";
import path from "path";
import os from "os";
import process from "process";
import { Config } from "../types";
import { OpenSSL } from "./openssl";

export class Site {
  private readonly config: Config;
  private readonly DOMAIN: string;
  private readonly PORT: number;
  private readonly SECURE: boolean;

  private CRT: string | null = null;
  private KEY: string | null = null;

  constructor (config: Config, domain: string, port: number, secure: boolean) {
    this.config = config;
    this.DOMAIN = domain;
    this.PORT = port;
    this.SECURE = secure;
  }

  async createSite() {
    console.log('Creating a site for domain', this.DOMAIN, '...');

    const nginxConfName = this.SECURE ? 'nginx.secure.conf' : 'nginx.unsecure.conf';

    // generate certificates and get names and directories
    if (this.SECURE) {
      const { key, crt} = await this.secure();
      this.KEY = key;
      this.CRT = crt;
    }

    const nginxConf = await fs.readFile(path.join(process.cwd(), 'src', 'stubs', nginxConfName));
    let domainConf = nginxConf.toString()
      .replace('{{DOMAIN}}', this.DOMAIN)
      .replace('{{TARGET_PORT}}', this.PORT.toString());

    if (this.SECURE) {
      domainConf = domainConf
        .replace('{{DOMAIN}}', this.DOMAIN)
        .replace('{{CERTIFICATE_PATH}}', this.CRT!)
        .replace('{{CERTIFICATE_KEY_PATH}}', this.KEY!);
    }

    const domainConfName = this.DOMAIN + '.conf';

    await fs.writeFile(path.join(this.nginxDir(), domainConfName), domainConf);

    console.log('Site created');
  }

  private async secure() {
    const openSSL = new OpenSSL(this.config, this.DOMAIN);
    await openSSL.createCA()
    return await openSSL.generateCertificate();
  }

  private nginxDir () {
    return this.config.nginx_dir ?? path.join(os.homedir(), '.config', 'nginx');
  }
}