import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export class Logger {
  private buffer: string[] = [];

  constructor(private readonly filePath = "logs/latest.log") {
    mkdirSync(dirname(filePath), { recursive: true });
  }

  info(message: string): void {
    this.write("INFO", message);
  }

  warn(message: string): void {
    this.write("WARN", message);
  }

  error(message: string): void {
    this.write("ERROR", message);
  }

  flush(): void {
    if (this.buffer.length === 0) {
      return;
    }
    appendFileSync(this.filePath, `${this.buffer.join("\n")}\n`, "utf8");
    this.buffer = [];
  }

  private write(level: string, message: string): void {
    const line = `${new Date().toISOString()} [${level}] ${message}`;
    this.buffer.push(line);
    console.log(line);
  }
}
