export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to your Lumos App
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          Get started by editing{" "}
          <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
            src/app/page.tsx
          </code>
        </p>
      </div>
    </main>
  );
}
