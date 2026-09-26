"use client";

import { useActionState } from "react";

import { updateProfile, type ProfileFormState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

const fieldClassName =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40";

const initialState: ProfileFormState = {};

type ProfileFormProps = {
  fullName: string;
  phone: string;
  email: string;
};

export function ProfileForm({ fullName, phone, email }: ProfileFormProps) {
  const [state, action, pending] = useActionState(updateProfile, initialState);

  return (
    <form action={action} className="mt-8 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="email">
          E-pošta
        </label>
        <input id="email" value={email} readOnly className={`${fieldClassName} bg-muted`} />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="full_name">
          Ime in priimek
        </label>
        <input
          id="full_name"
          name="full_name"
          autoComplete="name"
          defaultValue={fullName}
          className={fieldClassName}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="phone">
          Telefon
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={phone}
          className={fieldClassName}
        />
      </div>
      {state.error ? (
        <p className="text-sm text-primary" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-muted-foreground" role="status">
          Podatki so shranjeni.
        </p>
      ) : null}
      <Button type="submit" className="h-11 rounded-full" disabled={pending}>
        {pending ? "Shranjujem…" : "Shrani"}
      </Button>
    </form>
  );
}
