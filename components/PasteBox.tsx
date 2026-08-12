"use client";

import { ClipboardEvent } from "react";

interface PasteBoxProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  count: number;
  placeholder: string;
}

export default function PasteBox({
  label,
  value,
  onChange,
  count,
  placeholder,
}: PasteBoxProps) {
  // Every paste is appended to the end of whatever is already here, instead
  // of inserting at the cursor. That way pasting rankings in chunks (1-50,
  // then 51-100, ...) just accumulates correctly no matter where the
  // cursor/selection happens to be.
  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    if (!pasted) return;
    const separator = value && !value.endsWith("\n") ? "\n" : "";
    onChange(value + separator + pasted);
  };

  return (
    <div className="flex flex-1 flex-col gap-1.5 min-w-0">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">
            {count > 0 ? `${count} parsed` : ""}
          </span>
          {value && (
            <button
              onClick={() => onChange("")}
              className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        placeholder={placeholder}
        spellCheck={false}
        className="h-40 w-full resize-y rounded-lg border border-zinc-300 bg-white p-3 font-mono text-xs text-zinc-800 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-zinc-500"
      />
      <p className="text-[11px] text-zinc-400">
        Pasting always adds to the end &mdash; paste your list in chunks (1-50,
        51-100, ...) one after another. Use Clear to start over.
      </p>
    </div>
  );
}
