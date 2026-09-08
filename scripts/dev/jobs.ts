import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout } from "node:timers/promises";
import { stripVTControlCharacters } from "node:util";
import { signalProcessTree } from "./actions.ts";
import type { Job } from "./contracts.ts";

export class Jobs {
  current: Job | null = null;
  private child: ChildProcess | null = null;
  private stopping: Promise<void> | null = null;

  get busy() {
    return this.child !== null || this.stopping !== null;
  }

  launch(current: Job, executable: string, args: string[], cwd: string) {
    if (this.busy)
      throw new Error("Stop the running command or wait for it to finish.");
    this.current = current;
    const child = spawn(executable, args, {
      cwd,
      env: {
        ...process.env,
        CI: "true",
        SUPABASE_TELEMETRY_DISABLED: "1",
        SKIP_ENV_VALIDATION: "true",
      },
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
      shell: process.platform === "win32" && executable !== process.execPath,
    });
    this.child = child;
    const append = (data: Buffer) => {
      current.log = (
        current.log + stripVTControlCharacters(data.toString())
      ).slice(-100_000);
    };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    child.on("error", (error) => {
      current.log += `\n${error.message}`;
    });
    child.on("close", (code) => {
      current.status = this.stopping
        ? "stopped"
        : code === 0
          ? "ready"
          : "failed";
      current.log += `\n${current.command}: ${current.status}\n`;
      if (!this.stopping) this.child = null;
    });
  }

  stop() {
    if (this.stopping) return this.stopping;
    const child = this.child;
    if (!child) return Promise.resolve();
    const closed = once(child, "close");
    this.stopping = (async () => {
      try {
        await signalProcessTree(child);
        // Escalate even if the parent exits first: descendants can ignore SIGTERM.
        await setTimeout(1000);
        await signalProcessTree(child, true);
        await closed;
        this.child = null;
        if (this.current) this.current.status = "stopped";
      } finally {
        this.stopping = null;
      }
    })();
    return this.stopping;
  }
}
