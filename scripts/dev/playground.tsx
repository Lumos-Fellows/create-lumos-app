import { useLayoutEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { commandName, type Job } from "./contracts.ts";
import { FileExplorer } from "./file-explorer.tsx";
import { ProjectForm } from "./project-form.tsx";
import { usePlayground } from "./use-playground.ts";

function CommandLog({ job }: { job: Job | null }) {
  const log = useRef<HTMLPreElement>(null);
  const atBottom = useRef(true);
  useLayoutEffect(() => {
    if (job?.log && log.current && atBottom.current)
      log.current.scrollTop = log.current.scrollHeight;
  }, [job?.log]);
  return (
    <pre
      ref={log}
      role="log"
      aria-label="Command output"
      className="h-44 overflow-auto bg-primary p-5 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words text-primary-foreground"
      onScroll={(event) => {
        const element = event.currentTarget;
        atBottom.current =
          element.scrollHeight - element.scrollTop - element.clientHeight < 40;
      }}
    >
      {job?.log ?? ""}
    </pre>
  );
}

export function Playground() {
  const app = usePlayground();
  const [command, setCommand] = useState("");
  const [deleteTarget, setDeleteTarget] = useState("");
  const busy = app.pending || app.running;
  const checks = app.commands.filter(
    (name) => name !== "dev" && name !== "start",
  );
  const selectedCommand = checks.includes(command)
    ? command
    : (checks[0] ?? "");
  const devCommand = app.commands.includes("dev") ? "dev" : "start";
  return (
    <main className="mx-auto grid max-w-[1600px] grid-cols-1 gap-5 p-3 sm:p-6 lg:grid-cols-[310px_minmax(0,1fr)] lg:p-10">
      <ProjectForm
        busy={busy}
        error={app.error}
        onCreate={app.create}
        onError={app.setError}
      />
      <Card className="min-w-0 overflow-hidden" aria-labelledby="files-heading">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <h2 id="files-heading" className="text-base font-semibold">
            Explore files
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={app.project}
              onValueChange={app.selectProject}
              disabled={!app.names.length}
            >
              <SelectTrigger className="w-48" aria-label="Project to explore">
                <SelectValue placeholder="No projects yet" />
              </SelectTrigger>
              <SelectContent>
                {app.names.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" type="button" onClick={app.refresh}>
              Refresh
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  type="button"
                  className="text-destructive"
                  disabled={busy || !app.project}
                  onClick={() => setDeleteTarget(app.project)}
                >
                  Delete project
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[min(32rem,calc(100%-2rem))]">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {deleteTarget}?</AlertDialogTitle>
                  {/* HEADING-DESCRIPTION: Explain the permanent effect before deletion. */}
                  <AlertDialogDescription>
                    This project and all its files will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className={buttonVariants({ variant: "destructive" })}
                    disabled={busy}
                    onClick={() => void app.deleteProject(deleteTarget)}
                  >
                    Delete project
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <p className="px-5 pb-4 text-xs break-all text-muted-foreground">
          {app.project
            ? `.playground/${app.project}`
            : "Your generated projects will appear here."}
        </p>
        <FileExplorer
          key={app.project}
          project={app.project}
          revision={app.revision}
          onError={app.setError}
        />
      </Card>
      <Card className="min-w-0 overflow-hidden" aria-label="Project commands">
        <div className="flex flex-wrap items-center gap-3 p-5">
          <Button
            type="button"
            variant="outline"
            disabled={busy || !app.commands.includes(devCommand)}
            onClick={() => void app.run(devCommand)}
          >
            Start dev server
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={app.pending || !app.running}
            onClick={() => void app.stop()}
          >
            Stop
          </Button>
          <div className="flex gap-2">
            <Select
              value={selectedCommand}
              onValueChange={setCommand}
              disabled={busy || !checks.length}
            >
              <SelectTrigger className="w-36" aria-label="Project command">
                <SelectValue placeholder="No commands" />
              </SelectTrigger>
              <SelectContent>
                {checks.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              disabled={busy || !selectedCommand}
              onClick={() => void app.run(commandName.parse(selectedCommand))}
            >
              Run
            </Button>
          </div>
          {app.job && (
            <div
              role="status"
              className="flex w-full flex-wrap items-center gap-2 text-xs text-muted-foreground"
            >
              <span>
                {app.job.name} · {app.job.command}
              </span>
              <Badge
                variant={
                  app.job.status === "failed" ? "destructive" : "secondary"
                }
              >
                {app.job.status}
              </Badge>
            </div>
          )}
          {app.connection && (
            <p role="status" className="text-sm text-destructive">
              {app.connection}
            </p>
          )}
        </div>
        <CommandLog job={app.job} />
      </Card>
    </main>
  );
}
