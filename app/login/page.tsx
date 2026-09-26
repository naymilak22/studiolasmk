import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser, safeNextPath } from "@/lib/auth";

export const metadata = {
  title: "Prijava",
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);
  const user = await getCurrentUser();

  if (user) {
    redirect(nextPath);
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-muted px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border bg-background px-6 py-8 shadow-sm sm:px-8">
        <p className="text-xs font-medium tracking-[0.22em] text-primary uppercase">
          Studio Las MK
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Prijava</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Za naročilo termina se prijavite z Google računom ali s povezavo na e-pošto.
        </p>
        <div className="mt-8">
          <LoginForm
            nextPath={nextPath}
            initialError={params.error ? "Prijava ni uspela. Poskusite znova." : undefined}
          />
        </div>
      </div>
    </main>
  );
}
