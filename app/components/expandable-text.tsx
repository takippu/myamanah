"use client";

import { useMemo, useState } from "react";

type ExpandableTextProps = {
  text: string;
  collapsedChars?: number;
  className?: string;
  buttonClassName?: string;
};

export function ExpandableText({
  text,
  collapsedChars = 80,
  className = "",
  buttonClassName = "",
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const normalizedText = text.trim();

  const shouldCollapse = normalizedText.length > collapsedChars;
  const collapsedText = useMemo(() => {
    if (!shouldCollapse) {
      return normalizedText;
    }

    return `${normalizedText.slice(0, collapsedChars).trimEnd()}...`;
  }, [collapsedChars, normalizedText, shouldCollapse]);

  return (
    <div className="min-w-0">
      <p className={`min-w-0 whitespace-pre-wrap break-words ${className}`}>
        {expanded || !shouldCollapse ? normalizedText : collapsedText}
      </p>
      {shouldCollapse ? (
        <button
          type="button"
          className={`mt-1 text-xs font-semibold text-sky-700 underline underline-offset-2 ${buttonClassName}`}
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((current) => !current);
          }}
        >
          {expanded ? "See less" : "See more"}
        </button>
      ) : null}
    </div>
  );
}
