import fs from "fs/promises";
import { exec } from "child_process";

export class Utils {
  static fileExists (path: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      try {
        await fs.readFile(path);
        resolve(true);
      } catch (err) {
        resolve(false);
      }
    });
  }

  static execp (command: string) {
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