import fs from 'fs/promises';
import { exec } from 'child_process';

export class Utils {
  static fileExists(path: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      try {
        await fs.readFile(path);
        resolve(true);
      } catch (err) {
        resolve(false);
      }
    });
  }

  static async createFile(path: string, data: string): Promise<void> {
    await fs.writeFile(path, data);
  }

  static async readFile(path: string): Promise<string> {
    const fileContent = await fs.readFile(path);
    return fileContent.toString();
  }

  static async dirExists(path: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      try {
        await fs.readdir(path);
        resolve(true);
      } catch (err) {
        resolve(false);
      }
    });
  }

  static async createDir(path: string): Promise<void> {
    return await fs.mkdir(path);
  }

  static execp(command: string) {
    return new Promise((resolve, reject) => {
      const cmd = exec(command);
      cmd.on('error', (error) => {
        console.log(error);
        reject(error);
      });
      cmd.on('close', resolve);
    });
  }
}
