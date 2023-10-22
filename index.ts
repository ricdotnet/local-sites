import commander from 'commander';
import config from './lc.config.json';
import { OpenSSL } from './src/openssl';
import { Site } from "./src/site";
import { Utils } from "./src/utils";

const command: commander.Command = commander.createCommand();
command
  .version('1.0')
  .option('-d, --domain <domain>', 'Target domain for the certificate')
  .option('-p, --port [port]', 'Target port to proxy')
  .option('-s, --secure', 'Secure the domain with ssl')
  .parse(process.argv);

const { domain, port, secure } = command.opts();

(async () => {
  console.log('Initiating site creation ...')

  const site = new Site(config, domain, port, secure);
  await site.createSite();

  await Utils.execp('sudo nginx -s reload');

  console.log('Finished site creation!')
})();
