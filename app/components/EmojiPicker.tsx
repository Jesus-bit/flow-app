"use client";

import { useRef, useCallback } from "react";
import { useFlowStore, type CustomEmoji } from "../store";

const EMOJI_GROUPS = [
  { label: "Caras", emojis: ["😀","😂","🥹","😍","🤩","😎","🤔","😴","🥳","😤","😱","🤯","🫡"] },
  { label: "Manos", emojis: ["👍","👎","👋","🤝","✌️","🤞","👏","🙌","💪","🫶"] },
  { label: "Objetos", emojis: ["⭐","🔥","💡","🎯","🚀","💎","🏆","📌","🔗","⚡"] },
  { label: "Símbolos", emojis: ["✅","❌","⚠️","❓","💬","🔔","❤️","💜","💚","🩵"] },
];

type Props = {
  onSelect: (text: string) => void;
};

export default function EmojiPicker({ onSelect }: Props) {
  const customEmojis = useFlowStore((s) => s.customEmojis);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !file.name.endsWith(".svg")) return;

      const reader = new FileReader();
      reader.onload = () => {
        const svg = reader.result as string;
        const name = file.name.replace(/\.svg$/, "").replace(/[^a-zA-Z0-9_-]/g, "-");
        const emoji: CustomEmoji = {
          id: `custom-${Date.now()}`,
          name,
          svg,
        };
        useFlowStore.getState().addCustomEmoji(emoji);
        onSelect(`:${name}:`);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [onSelect]
  );

  const handleRemove = useCallback((emojiId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    useFlowStore.getState().removeCustomEmoji(emojiId);
  }, []);

  return (
    <div className="emoji-picker">
      {EMOJI_GROUPS.map((group) => (
        <div key={group.label} className="emoji-group">
          <div className="emoji-group-label">{group.label}</div>
          <div className="emoji-grid">
            {group.emojis.map((em) => (
              <button
                key={em}
                className="emoji-btn"
                onClick={() => onSelect(em)}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="emoji-group">
        <div className="emoji-group-label">
          Personalizados
          <button
            className="emoji-upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            + SVG
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".svg"
            style={{ display: "none" }}
            onChange={handleUpload}
          />
        </div>
        <div className="emoji-grid">
          {customEmojis.map((em) => (
            <button
              key={em.id}
              className="emoji-btn emoji-btn-custom"
              onClick={() => onSelect(`:${em.name}:`)}
              title={`:${em.name}:`}
            >
              <img src={em.svg} alt={em.name} width={22} height={22} />
              <span
                className="emoji-remove"
                onClick={(e) => handleRemove(em.id, e)}
              >
                ×
              </span>
            </button>
          ))}
          {customEmojis.length === 0 && (
            <span className="emoji-empty">Sube un .svg</span>
          )}
        </div>
      </div>
    </div>
  );
}
