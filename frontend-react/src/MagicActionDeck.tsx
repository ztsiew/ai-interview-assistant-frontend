import { MessageOutlined, ArrowRightOutlined, HeartOutlined, StarFilled } from "@ant-design/icons";

type MagicActionType = "deepen" | "shift" | "empathy";

interface MagicActionDeckProps {
  onActionClick: (type: MagicActionType) => void;
  hasNewEmpathy?: boolean;
}

const cards: {
  type: MagicActionType;
  label: string;
  Icon: typeof MessageOutlined;
  gradient: string;
  shadow: string;
}[] = [
  {
    type: "deepen",
    label: "Deepen Inquiry",
    Icon: MessageOutlined,
    gradient: "linear-gradient(135deg, #22d3ee, #3b82f6, #1d4ed8)",
    shadow: "0 18px 40px rgba(37, 99, 235, 0.35)",
  },
  {
    type: "shift",
    label: "Shift Topic",
    Icon: ArrowRightOutlined,
    gradient: "linear-gradient(135deg, #34d399, #14b8a6, #0d9488)",
    shadow: "0 18px 40px rgba(13, 148, 136, 0.32)",
  },
  {
    type: "empathy",
    label: "Show Empathy",
    Icon: HeartOutlined,
    gradient: "linear-gradient(135deg, #a855f7, #ec4899, #e11d48)",
    shadow: "0 18px 40px rgba(236, 72, 153, 0.35)",
  },
];

export function MagicActionDeck({ onActionClick, hasNewEmpathy }: MagicActionDeckProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 12,
        marginBottom: 12,
      }}
    >
      {cards.map(({ type, label, Icon, gradient, shadow }) => (
        <button
          key={type}
          type="button"
          onClick={() => onActionClick(type)}
          style={{
            position: "relative",
            padding: "14px 14px",
            borderRadius: 18,
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            backgroundImage: gradient,
            boxShadow: shadow,
            color: "white",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            transition: "transform 0.22s ease, box-shadow 0.22s ease",
          }}
          className="magic-action-card"
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(120deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02), transparent)",
              mixBlendMode: "screen",
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 14,
                background: "rgba(255,255,255,0.22)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(255,255,255,0.45)",
              }}
            >
              <Icon style={{ fontSize: 18, color: "white" }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 11, opacity: 0.82 }}>Focus this moment</div>
            </div>
          </div>
          <div style={{ position: "relative" }}>
            {type === "empathy" && hasNewEmpathy && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  width: 10,
                  height: 10,
                  borderRadius: "999px",
                  backgroundColor: "#f97316",
                  boxShadow: "0 0 0 3px rgba(248, 250, 252, 0.55)",
                }}
              />
            )}
            <div
              style={{
                position: "relative",
                width: 26,
                height: 26,
                borderRadius: "999px",
                background: "rgba(255,255,255,0.16)",
                border: "1px solid rgba(255,255,255,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <StarFilled style={{ fontSize: 14, color: "white" }} />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}