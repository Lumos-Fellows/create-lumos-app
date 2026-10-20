import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { type ProjectInput, projectInput } from "./contracts.ts";

interface ProjectFormProps {
  busy: boolean;
  error: string;
  onCreate: (input: ProjectInput) => Promise<void>;
  onError: (message: string) => void;
}

export function ProjectForm({
  busy,
  error,
  onCreate,
  onError,
}: ProjectFormProps) {
  const [framework, setFramework] = useState("nextjs");
  return (
    <Card className="self-start lg:row-span-2" aria-label="Create a project">
      <CardContent className="pt-6">
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            try {
              const data = new FormData(event.currentTarget);
              const input = projectInput.parse({
                name: data.get("name"),
                framework: data.get("framework"),
                template: data.get("template") ?? "bare",
                packageManager: data.get("packageManager"),
                components: data.has("components"),
                supabase: data.has("supabase"),
                posthog: data.has("posthog"),
                sentry: data.has("sentry"),
              });
              void onCreate(input);
            } catch (failure) {
              onError(String(failure));
            }
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="name">Project name</Label>
            <Input
              id="name"
              name="name"
              required
              pattern="[a-z0-9][a-z0-9-]{0,63}"
              maxLength={64}
              placeholder="my-lumos-test"
              autoComplete="off"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="framework">Framework</Label>
              <Select
                name="framework"
                value={framework}
                onValueChange={setFramework}
              >
                <SelectTrigger id="framework">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nextjs">Next.js</SelectItem>
                  <SelectItem value="expo">Expo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="package-manager">Package manager</Label>
              <Select name="packageManager" defaultValue="pnpm">
                <SelectTrigger id="package-manager">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pnpm">pnpm</SelectItem>
                  <SelectItem value="npm">npm</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {framework === "nextjs" && (
            <div className="grid gap-2">
              <Label htmlFor="template">Template</Label>
              <Select name="template" defaultValue="notes-app">
                <SelectTrigger id="template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="notes-app">Basic Notes App</SelectItem>
                  <SelectItem value="bare">Bare</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <fieldset className="grid gap-4">
            <legend className="mb-4 text-sm font-medium">Integrations</legend>
            <div className="flex items-center gap-2">
              <Checkbox id="components" name="components" defaultChecked />
              <Label htmlFor="components">
                {framework === "expo"
                  ? "React Native Reusables"
                  : "shadcn/ui components"}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="supabase" name="supabase" />
              <Label htmlFor="supabase">Supabase</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="posthog" name="posthog" />
              <Label htmlFor="posthog">PostHog analytics</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="sentry" name="sentry" />
              <Label htmlFor="sentry">Sentry error tracking</Label>
            </div>
          </fieldset>
          <Button type="submit" disabled={busy}>
            Create project
          </Button>
        </form>
        {error && (
          <p
            role="alert"
            className="mt-4 whitespace-pre-wrap break-words text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
