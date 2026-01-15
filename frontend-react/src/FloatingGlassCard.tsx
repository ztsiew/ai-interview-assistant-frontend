import { Button, Typography } from "antd";
import ReactMarkdown from "react-markdown";

const { Text } = Typography;

type PromptType = "deepen" | "shift" | "empathy";

interface FloatingGlassCardProps {
  type: PromptType;
  text: string;
  onDismiss: () => void;
}

export function FloatingGlassCard({ type, text, onDismiss }: FloatingGlassCardProps) {
  const label =
    type === "deepen" ? "Deepen Inquiry" : type === "shift" ? "Shift Topic" : "Show Empathy";

  const accentColor =
    type === "deepen" ? "#1d4ed8" : type === "shift" ? "#0d9488" : "#e11d48";

  return (
    <div
      style={{
        // CHANGED: "absolute" keeps it inside the parent card, not the whole screen
        position: "absolute", 
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
    >
      {/* Greyed-out blurred backdrop */}
      <div
        onClick={onDismiss}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(15,23,42,0.35)",
          backdropFilter: "blur(4px)",
          borderRadius: "inherit", // Inherit corners from parent if needed
        }}
      />

      {/* Floating glass card */}
      <div
        style={{
          position: "relative",
          maxWidth: 640,
          width: "100%",
          padding: 24,
          borderRadius: 24,
          background: "rgba(248,250,252,0.96)",
          border: `2px solid ${accentColor}20`,
          boxShadow: "0 22px 55px rgba(15,23,42,0.35)",
          backdropFilter: "blur(16px)",
          animation: "scaleIn 0.25s ease-out",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ paddingRight: 16, flex: 1 }}>
            {/* Header Label */}
            <Text
              style={{
                color: accentColor,
                fontSize: 15,
                letterSpacing: 0.1,
                fontWeight: 750,
                textTransform: "uppercase",
                textDecoration: 'underline',
                textUnderlineOffset: 3,
               

              }}
            >
              {label}
            </Text>

            {/* Rich Text Content (Markdown) */}
            <div 
              style={{ 
                marginTop: 2, 
                fontSize: 15, 
                lineHeight: 1.6, 
                color: "#0f172a",
                maxHeight: "60vh", 
                overflowY: "auto"
              }}
            >
              <ReactMarkdown
                components={{
                  strong: ({ node, ...props }) => (
                    <span style={{ color: accentColor, fontWeight: 700 }} {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p style={{ margin: "0 0 16px 0" }} {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li style={{ marginBottom: 8, color: accentColor }} {...props}>
                       <span style={{ color: "#0f172a" }}>{props.children}</span>
                    </li>
                  ),
                }}
              >
                {text}
              </ReactMarkdown>
            </div>
          </div>

          <Button type="text" size="small" onClick={onDismiss} style={{color: "#64748b"}}>
            ✕
          </Button>
        </div>
      </div>
      
      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}