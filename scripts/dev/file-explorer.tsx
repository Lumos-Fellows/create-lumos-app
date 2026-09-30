import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { request } from "./api.ts";
import { entriesSchema, type FileEntry } from "./contracts.ts";

interface DirectoryProps {
  path: string;
  open: boolean;
  revision: string;
  selected: string;
  onSelect: (path: string) => void;
  onError: (message: string) => void;
}

function Directory({
  path,
  open,
  revision,
  selected,
  onSelect,
  onError,
}: DirectoryProps) {
  const [entries, setEntries] = useState<FileEntry[] | null>(null);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setEntries(null);
    void request(
      `/api/tree?path=${encodeURIComponent(path)}&revision=${encodeURIComponent(revision)}`,
      {
        signal: controller.signal,
      },
    )
      .then(async (response) => entriesSchema.parse(await response.json()))
      .then((files) => {
        if (!controller.signal.aborted) setEntries(files);
      })
      .catch((failure: Error) => {
        if (!controller.signal.aborted) {
          setEntries([]);
          onError(failure.message);
        }
      });
    return () => controller.abort();
  }, [path, open, revision, onError]);
  if (!entries)
    return <p className="p-2 text-muted-foreground">Loading files</p>;
  if (!entries.length)
    return <p className="p-2 text-muted-foreground">No files yet.</p>;
  return entries.map((entry) =>
    entry.directory ? (
      <Folder
        key={entry.name}
        path={`${path}/${entry.name}`}
        name={entry.name}
        revision={revision}
        selected={selected}
        onSelect={onSelect}
        onError={onError}
      />
    ) : (
      <Button
        key={entry.name}
        type="button"
        variant={selected === `${path}/${entry.name}` ? "secondary" : "ghost"}
        size="sm"
        className="block h-auto w-full justify-start py-1.5 text-left font-normal"
        aria-current={selected === `${path}/${entry.name}` ? "true" : undefined}
        onClick={() => onSelect(`${path}/${entry.name}`)}
      >
        {entry.name}
      </Button>
    ),
  );
}

interface FolderProps extends Omit<DirectoryProps, "open"> {
  name: string;
}

function Folder({ name, ...props }: FolderProps) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="pl-3"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="py-2 whitespace-nowrap">{name}</summary>
      {open && <Directory {...props} open={open} />}
    </details>
  );
}

interface FileExplorerProps {
  project: string;
  revision: string;
  onError: (message: string) => void;
}

export function FileExplorer({
  project,
  revision,
  onError,
}: FileExplorerProps) {
  const [selected, setSelected] = useState("");
  const [content, setContent] = useState("Select a file to see its contents.");
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    setContent("Loading file");
    void request(
      `/api/file?path=${encodeURIComponent(selected)}&revision=${encodeURIComponent(revision)}`,
      {
        signal: controller.signal,
      },
    )
      .then((response) => response.text())
      .then((text) => {
        if (!controller.signal.aborted) setContent(text);
      })
      .catch((failure: Error) => {
        if (!controller.signal.aborted) setContent(failure.message);
      });
    return () => controller.abort();
  }, [selected, revision]);
  return (
    <div className="grid h-[48vh] min-h-96 grid-cols-1 border-t sm:grid-cols-[230px_minmax(0,1fr)]">
      <nav
        aria-label="File tree"
        className="overflow-auto border-b p-3 text-xs sm:border-r sm:border-b-0"
      >
        {project ? (
          <Directory
            path={project}
            open
            revision={revision}
            selected={selected}
            onSelect={setSelected}
            onError={onError}
          />
        ) : (
          <p className="p-2 text-muted-foreground">
            Create your first project to explore its files.
          </p>
        )}
      </nav>
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-muted/30">
        <div className="border-b px-4 py-3 font-mono text-xs break-all">
          {selected || "File preview"}
        </div>
        <pre className="min-h-0 flex-1 overflow-auto p-4 text-xs leading-relaxed">
          {content}
        </pre>
      </div>
    </div>
  );
}
