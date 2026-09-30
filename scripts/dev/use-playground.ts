import { useEffect, useRef, useState } from "react";
import { request } from "./api.ts";
import {
  type CommandInput,
  commandsSchema,
  jobSchema,
  type ProjectInput,
  type State,
  stateSchema,
} from "./contracts.ts";

export function usePlayground() {
  const [state, setState] = useState<State>({ projects: [], job: null });
  const [selection, setSelection] = useState("");
  const [commands, setCommands] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState("");
  const [refresh, setRefresh] = useState(0);
  const locked = useRef(false);
  const names = [...state.projects];
  if (state.job?.status === "running" && !names.includes(state.job.name))
    names.push(state.job.name);
  const project = names.includes(selection) ? selection : (names[0] ?? "");
  const running = state.job?.status === "running";
  const revision = `${refresh}:${state.job?.name}:${state.job?.command}:${state.job?.status}`;

  useEffect(() => {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await request("/api/state", {
          signal: controller.signal,
        });
        const result = stateSchema.parse(await response.json());
        if (!controller.signal.aborted) {
          setState(result);
          setConnection("");
        }
      } catch {
        if (!controller.signal.aborted)
          setConnection(
            "Playground disconnected. Check the terminal and reopen its URL.",
          );
      }
      if (!controller.signal.aborted)
        timeout = setTimeout(() => void poll(), 1000);
    }
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setCommands([]);
    if (project) {
      void request(
        `/api/commands?project=${encodeURIComponent(project)}&revision=${encodeURIComponent(revision)}`,
        {
          signal: controller.signal,
        },
      )
        .then(async (response) => commandsSchema.parse(await response.json()))
        .then((available) => {
          if (!controller.signal.aborted) setCommands(available);
        })
        .catch(() => {
          // A project being created may not have its package manifest yet.
        });
    }
    return () => controller.abort();
  }, [project, revision]);

  async function mutate(
    path: string,
    method: string,
    input?: CommandInput | ProjectInput,
  ) {
    if (locked.current) return;
    locked.current = true;
    setPending(true);
    setError("");
    try {
      const response = await request(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: input ? JSON.stringify(input) : undefined,
      });
      if (path === "/api/projects") {
        const job = jobSchema.parse(await response.json());
        setSelection(job.name);
      }
      const result = await request("/api/state");
      setState(stateSchema.parse(await result.json()));
      setRefresh((value) => value + 1);
    } catch (failure) {
      setError(String(failure));
    } finally {
      locked.current = false;
      setPending(false);
    }
  }

  return {
    project,
    names,
    commands,
    job: state.job,
    pending,
    running,
    error,
    connection,
    revision,
    setError,
    selectProject: setSelection,
    refresh: () => setRefresh((value) => value + 1),
    create: (input: ProjectInput) => mutate("/api/projects", "POST", input),
    run: (command: CommandInput["command"]) =>
      mutate("/api/commands", "POST", { name: project, command }),
    stop: () => mutate("/api/stop", "POST"),
    deleteProject: (name: string) =>
      mutate(`/api/project?project=${encodeURIComponent(name)}`, "DELETE"),
  };
}
