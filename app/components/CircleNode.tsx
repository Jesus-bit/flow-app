"use client";

import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useFlowStore, type CustomEmoji } from "../store";
import EmojiPicker from "./EmojiPicker";

function renderLabelWithEmojis(
  label: string,
  customEmojis: CustomEmoji[]
): React.ReactNode[] {
  if (!label) return [];
  const parts = label.split(/(:[a-zA-Z0-9_-]+:)/g);
  return parts.map((part, i) => {
    const match = part.match(/^:([a-zA-Z0-9_-]+):$/);
    if (match) {
      const emoji = customEmojis.find((e) => e.name === match[1]);
      if (emoji) {
        return (
          <img
            key={i}
            src={emoji.svg}
            alt={`:${emoji.name}:`}
            title={`:${emoji.name}:`}
            style={{
              width: 18,
              height: 18,
              verticalAlign: "middle",
              display: "inline-block",
            }}
          />
        );
      }
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export default function CircleNode({ id, data }: NodeProps) {
  const label = (data.label as string) || "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const customEmojis = useFlowStore((s) => s.customEmojis);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // Close editor when clicking outside the entire editor area
  useEffect(() => {
    if (!editing) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        editorRef.current &&
        !editorRef.current.contains(e.target as HTMLElement)
      ) {
        useFlowStore.getState().updateNodeLabel(id, draft);
        setEditing(false);
        setShowEmojiPicker(false);
      }
    }

    // Use a small delay so the initial double-click doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editing, id, draft]);

  const commitEdit = useCallback(() => {
    useFlowStore.getState().updateNodeLabel(id, draft);
    setEditing(false);
    setShowEmojiPicker(false);
  }, [id, draft]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setDraft(label);
      setEditing(true);
    },
    [label]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        commitEdit();
      }
      if (e.key === "Escape") {
        setEditing(false);
        setShowEmojiPicker(false);
      }
    },
    [commitEdit]
  );

  const insertText = useCallback(
    (text: string) => {
      if (!inputRef.current) return;
      const ta = inputRef.current;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = draft.slice(0, start) + text + draft.slice(end);
      setDraft(newVal);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + text.length;
        ta.focus();
      });
    },
    [draft]
  );

  return (
    <div className="circle-node" onDoubleClick={handleDoubleClick}>
      <Handle type="target" position={Position.Top} className="circle-handle" />
      <Handle
        type="source"
        position={Position.Bottom}
        className="circle-handle"
      />

      {editing ? (
        <div className="circle-node-editor" ref={editorRef}>
          <textarea
            ref={inputRef}
            className="circle-node-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />
          <button
            className="emoji-toggle-btn"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            title="Emojis"
          >
            😀
          </button>
          {showEmojiPicker && (
            <div className="emoji-picker-anchor">
              <EmojiPicker onSelect={insertText} />
            </div>
          )}
        </div>
      ) : (
        <div className="circle-node-label">
          {label ? (
            renderLabelWithEmojis(label, customEmojis)
          ) : (
            <span className="circle-node-placeholder">✏️</span>
          )}
        </div>
      )}
    </div>
  );
}
