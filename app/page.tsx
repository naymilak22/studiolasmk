export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted px-6">
      <div className="w-full max-w-lg rounded-2xl border bg-background px-8 py-12 text-center shadow-sm">
        <p className="text-xs font-medium tracking-[0.22em] text-primary uppercase">
          Studio Las MK
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
          Frizerski studio
        </h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          Spletno naročanje pripravljamo.
        </p>
      </div>
    </main>
  );
}
