import { execSync } from "child_process";

export const runCommand = (command: string) => {
  return execSync(command, {
    encoding: "utf-8",
    env: {
      ...process.env,
      LC_ALL: "en_US.UTF-8",
      LANG: "en_US.UTF-8"
    }
  }).toString();
};
