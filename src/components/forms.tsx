"use client";

import { createContext, useContext, useRef, useState, useTransition } from "react";
import type { ActionState } from "@/lib/actions";

const Pending = createContext(false);

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  hidden?: Record<string, string>;
  /** رسالة تأكيد قبل الإرسال للإجراءات اللي ما تنعكس */
  confirm?: string;
};

/**
 * نموذج يستدعي Server Action ويعرض الخطأ أو النجاح تحته.
 * نرسل يدوياً (بدل form action) حتى ما تنمسح الحقول لو رجع خطأ.
 */
export function ActionForm({ action, children, className = "", hidden, confirm }: Props) {
  const [state, setState] = useState<ActionState>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        const submitter = (e.nativeEvent as SubmitEvent).submitter;
        const ask = submitter?.getAttribute("data-confirm") ?? confirm;
        if (ask && !window.confirm(ask)) return;
        const fd = new FormData(e.currentTarget, submitter);
        start(async () => {
          const r = await action(null, fd);
          setState(r);
          if (r?.ok) ref.current?.reset();
        });
      }}
    >
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <Pending.Provider value={pending}>{children}</Pending.Provider>
      {state?.error && (
        <p role="alert" className="mt-3 border-s-4 border-flame bg-flame-tint px-3 py-2 text-[0.95rem] font-medium">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="mt-3 border-s-4 border-ink bg-ink/5 px-3 py-2 text-[0.95rem] font-medium">
          {state.ok}
        </p>
      )}
    </form>
  );
}

export function Submit({
  children, variant = "ink", small = false, name, value, confirm, className = "",
}: {
  children: React.ReactNode; variant?: "ink" | "flame" | "line"; small?: boolean; name?: string; value?: string; confirm?: string; className?: string;
}) {
  const pending = useContext(Pending);
  const v = variant === "flame" ? "btn-flame" : variant === "line" ? "btn-line" : "";
  return (
    <button type="submit" name={name} value={value} data-confirm={confirm} disabled={pending} className={`btn ${v} ${small ? "btn-sm" : ""} ${className}`}>
      {children}
    </button>
  );
}
