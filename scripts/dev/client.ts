import {
  type CommandInput,
  commandName,
  commandsSchema,
  entriesSchema,
  errorSchema,
  jobSchema,
  projectInput,
  stateSchema,
} from "./contracts.ts";

function element(id: string) {
  const result = document.getElementById(id);
  if (!result) throw new Error(`Missing element: ${id}`);
  return result;
}
const form = element("create-form");
const projects = element("projects");
const createButton = element("create-button");
if (
  !(form instanceof HTMLFormElement) ||
  !(projects instanceof HTMLSelectElement) ||
  !(createButton instanceof HTMLButtonElement)
) {
  throw new Error("The playground form is unavailable.");
}
const projectForm = form;
const projectSelect = projects;
const submitButton = createButton;
const tree = element("tree");
let selectedProject = "";
let selectedFile = "";
let pending = false;
let running = false;
let availableCommands: string[] = [];

function button(id: string) {
  const result = element(id);
  if (!(result instanceof HTMLButtonElement))
    throw new Error(`Missing button: ${id}`);
  return result;
}
const commandSelect = element("command");
const deleteDialog = element("delete-dialog");
if (
  !(commandSelect instanceof HTMLSelectElement) ||
  !(deleteDialog instanceof HTMLDialogElement)
)
  throw new Error("Project controls are unavailable.");
const commands = commandSelect;
const confirmation = deleteDialog;

function updateControls() {
  const busy = pending || running;
  submitButton.disabled = busy;
  button("delete-project").disabled = busy || !selectedProject;
  button("start-dev").disabled =
    busy ||
    !availableCommands.some((name) => name === "dev" || name === "start");
  button("run-command").disabled = busy || !commands.value;
  button("stop").disabled = pending || !running;
  commands.disabled = busy || !commands.options.length;
}

async function refreshCommands() {
  const project = selectedProject;
  availableCommands = [];
  commands.replaceChildren();
  updateControls();
  if (!project) return;
  try {
    const response = await request(
      `/api/commands?project=${encodeURIComponent(project)}`,
    );
    const result = commandsSchema.parse(await response.json());
    if (selectedProject !== project) return;
    availableCommands = result;
    commands.replaceChildren(
      ...result
        .filter((name) => name !== "dev" && name !== "start")
        .map((name) => new Option(name, name)),
    );
  } catch {
    // Partially created projects may not have a manifest yet.
  }
  updateControls();
}

async function mutate(path: string, method: string, input?: CommandInput) {
  pending = true;
  showError("");
  updateControls();
  try {
    await request(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: input ? JSON.stringify(input) : undefined,
    });
    await refreshState();
  } catch (error) {
    showError(String(error));
  } finally {
    pending = false;
    updateControls();
  }
}

let projectToDelete = "";
button("delete-project").addEventListener("click", () => {
  projectToDelete = selectedProject;
  element("delete-heading").textContent = `Delete ${projectToDelete}?`;
  confirmation.showModal();
});
button("cancel-delete").addEventListener("click", () => confirmation.close());
button("confirm-delete").addEventListener("click", () => {
  confirmation.close();
  void mutate(
    `/api/project?project=${encodeURIComponent(projectToDelete)}`,
    "DELETE",
  );
});
button("start-dev").addEventListener("click", () => {
  void mutate("/api/commands", "POST", {
    name: selectedProject,
    command: availableCommands.includes("dev") ? "dev" : "start",
  });
});
button("run-command").addEventListener("click", () => {
  void mutate("/api/commands", "POST", {
    name: selectedProject,
    command: commandName.parse(commands.value),
  });
});
button("stop").addEventListener("click", () => {
  void mutate("/api/stop", "POST");
});

function showError(message: string) {
  element("error").textContent = message;
}
async function request(path: string, options?: RequestInit) {
  const response = await fetch(path, options);
  if (!response.ok) {
    const error = errorSchema.parse(await response.json());
    throw new Error(error.error);
  }
  return response;
}

async function readDirectory(path: string, parent: HTMLElement) {
  const response = await request(`/api/tree?path=${encodeURIComponent(path)}`);
  const entries = entriesSchema.parse(await response.json());
  parent.replaceChildren();
  if (!entries.length) parent.textContent = "No files yet.";
  for (const entry of entries) {
    const entryPath = `${path}/${entry.name}`;
    if (entry.directory) {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = entry.name;
      const children = document.createElement("div");
      details.append(summary, children);
      let loaded = false;
      details.addEventListener("toggle", () => {
        if (!details.open || loaded) return;
        loaded = true;
        void readDirectory(entryPath, children).catch((error: Error) => {
          loaded = false;
          showError(String(error));
        });
      });
      parent.append(details);
    } else {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "file";
      button.textContent = entry.name;
      button.addEventListener("click", () => {
        selectedFile = entryPath;
        for (const active of tree.querySelectorAll("[aria-current]"))
          active.removeAttribute("aria-current");
        button.setAttribute("aria-current", "true");
        element("file-path").textContent = entryPath;
        element("file-content").textContent = "Loading…";
        void request(`/api/file?path=${encodeURIComponent(entryPath)}`)
          .then((result) => result.text())
          .then((content) => {
            if (selectedFile === entryPath)
              element("file-content").textContent = content;
          })
          .catch((error: Error) => {
            if (selectedFile === entryPath)
              element("file-content").textContent = String(error);
          });
      });
      parent.append(button);
    }
  }
}

async function refreshTree() {
  selectedFile = "";
  element("file-path").textContent = "File preview";
  element("file-content").textContent = "Select a file to see its contents.";
  if (!selectedProject) {
    tree.textContent = "No projects yet.";
    return;
  }
  // Build offscreen so switching projects cannot display a stale response.
  const contents = document.createElement("div");
  const project = selectedProject;
  await readDirectory(project, contents);
  if (project === selectedProject) tree.replaceChildren(contents);
}

let lastStatus = "";
async function refreshState() {
  const response = await request("/api/state");
  const state = stateSchema.parse(await response.json());
  element("connection").textContent = "";
  const names = state.projects;
  if (state.job?.status === "running" && !names.includes(state.job.name))
    names.push(state.job.name);
  if (
    Array.from(projectSelect.options)
      .map((option) => option.value)
      .join("/") !== names.join("/")
  ) {
    projectSelect.replaceChildren(
      ...names.map((name) => new Option(name, name)),
    );
    if (!names.length) projectSelect.add(new Option("No projects yet", ""));
  }
  if (!names.includes(selectedProject)) {
    selectedProject = names[0] ?? "";
    await refreshTree();
    await refreshCommands();
  }
  projectSelect.value = selectedProject;
  element("location").textContent = `.playground/${selectedProject}`;
  running = state.job?.status === "running";
  updateControls();
  if (state.job) {
    const log = element("log");
    const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
    if (log.textContent !== state.job.log) {
      log.textContent = state.job.log;
      if (atBottom) log.scrollTop = log.scrollHeight;
    }
    element("status").textContent =
      `${state.job.name} · ${state.job.command} · ${state.job.status}`;
    const status = `${state.job.name}:${state.job.command}:${state.job.status}`;
    if (
      status !== lastStatus &&
      state.job.status !== "running" &&
      selectedProject === state.job.name
    ) {
      await refreshTree();
      await refreshCommands();
    }
    lastStatus = status;
  } else {
    element("log").textContent = "";
    element("status").textContent = "";
    lastStatus = "";
  }
}

projectForm.addEventListener("change", () => {
  const expo = new FormData(projectForm).get("framework") === "expo";
  element("template-field").hidden = expo;
  element("components-label").textContent = expo
    ? "React Native Reusables"
    : "shadcn/ui components";
});
projectForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void (async () => {
    pending = true;
    submitButton.disabled = true;
    element("error").textContent = "";
    try {
      const data = new FormData(projectForm);
      const input = projectInput.parse({
        name: data.get("name"),
        framework: data.get("framework"),
        template: data.get("template"),
        packageManager: data.get("packageManager"),
        components: data.has("components"),
        supabase: data.has("supabase"),
        posthog: data.has("posthog"),
        sentry: data.has("sentry"),
      });
      const response = await request("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const job = jobSchema.parse(await response.json());
      selectedProject = job.name;
      selectedFile = "";
      tree.textContent =
        "Creating project. Files will appear when it finishes.";
      element("file-path").textContent = "File preview";
      element("file-content").textContent =
        "Select a file to see its contents.";
      await refreshState();
    } catch (error) {
      showError(String(error));
    } finally {
      pending = false;
      updateControls();
    }
  })();
});
projectSelect.addEventListener("change", () => {
  selectedProject = projectSelect.value;
  void refreshCommands();
  void refreshTree().catch((error: Error) => showError(error.message));
});
element("refresh").addEventListener("click", () => {
  void refreshCommands();
  void refreshTree().catch((error: Error) => showError(error.message));
});
async function poll() {
  try {
    await refreshState();
  } catch {
    element("connection").textContent =
      "Dashboard disconnected. Check the terminal and reopen its URL.";
  }
  window.setTimeout(() => {
    void poll();
  }, 1000);
}
void poll();
