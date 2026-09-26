import Link from "next/link";

import { signOut } from "@/app/auth/actions";
import { MobileNav, type NavLink } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth";

export async function SiteHeader() {
  const profile = await getCurrentProfile();
  const links: NavLink[] = [
    { href: "/", label: "Domov" },
    { href: "/#storitve", label: "Storitve" },
    { href: "/#delovni-cas", label: "Delovni čas" },
    { href: "/book", label: "Naroči termin" },
  ];

  if (profile) {
    links.push({ href: "/profile", label: "Profil" });
  }

  if (profile?.role === "admin") {
    links.push({ href: "/admin", label: "Salon" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0 text-sm font-semibold tracking-tight text-primary">
          Studio Las MK
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Glavno">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          {profile ? (
            <form action={signOut}>
              <Button type="submit" variant="ghost" className="rounded-full">
                Odjava
              </Button>
            </form>
          ) : (
            <Button asChild className="rounded-full px-4">
              <Link href="/login">Prijava</Link>
            </Button>
          )}
        </nav>
        <MobileNav links={links} isSignedIn={Boolean(profile)} />
      </div>
    </header>
  );
}
