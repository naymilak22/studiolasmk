"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export type NavLink = {
  href: string;
  label: string;
};

type MobileNavProps = {
  links: NavLink[];
  isSignedIn: boolean;
};

export function MobileNav({ links, isSignedIn }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Zapri meni" : "Odpri meni"}
        onClick={() => setOpen(true)}
      >
        <Menu />
      </Button>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Zapri meni"
              className="absolute inset-0 bg-black/20"
              onClick={() => setOpen(false)}
            />
            <motion.div
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="Meni"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="absolute top-0 right-0 flex h-full w-[min(100%,20rem)] flex-col bg-background px-6 py-5 shadow-xl"
            >
              <div className="flex justify-end">
                <Button
                  ref={closeRef}
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Zapri meni"
                  onClick={() => setOpen(false)}
                >
                  <X />
                </Button>
              </div>
              <nav className="mt-6 flex flex-col gap-1" aria-label="Mobilna navigacija">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-xl px-3 py-3 text-base font-medium text-foreground hover:bg-muted"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto pt-6">
                {isSignedIn ? (
                  <form action={signOut}>
                    <Button type="submit" variant="outline" className="h-11 w-full rounded-full">
                      Odjava
                    </Button>
                  </form>
                ) : (
                  <Button asChild className="h-11 w-full rounded-full">
                    <Link href="/login">Prijava</Link>
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
