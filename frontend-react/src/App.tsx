import { useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Divider,
  Input,
  Layout,
  Modal,
  Space,
  Tag,
  Typography,
  message,
  Steps,
  List,
  Tabs,
} from "antd";
import {
  AudioOutlined,
  EyeOutlined,
  FilePdfOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { MagicActionDeck } from "./MagicActionDeck";
import { FloatingGlassCard } from "./FloatingGlassCard";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

export default function App() {
  // --- STATE ---
  const [showLanding, setShowLanding] = useState(true);
  const [customPrompt, setCustomPrompt] = useState("");
  const [planName, setPlanName] = useState<string | null>(null);
  const [activePlanData, setActivePlanData] = useState<any>(null);
  const [viewPlanOpen, setViewPlanOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [followup, setFollowup] = useState<string>("Waiting for insights...");
  const [transition, setTransition] = useState<string>("Waiting for insights...");
  const [empathy, setEmpathy] = useState<string>("Waiting for insights...");
  const [scorecardMd, setScorecardMd] = useState<string>("");
  const [scorecardOpen, setScorecardOpen] = useState(false);
  const [allocatedTime, setAllocatedTime] = useState<number>(30);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [activePrompt, setActivePrompt] = useState<{ type: "deepen" | "shift" | "empathy"; content: string; } | null>(null);
  const [hasNewEmpathy, setHasNewEmpathy] = useState(false);

  const pollTimer = useRef<number | null>(null);
  const prevEmpathyRef = useRef<string>("");
  const API_URL = "http://localhost:8000";

  // --- STYLES ---
  const glassStyle = {
    background: "rgba(230, 247, 255, 0.6)", 
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.4)",
    borderRadius: "16px",
  };

  const sharedBackgroundStyle: React.CSSProperties = {
    minHeight: "100vh",
    width: "100%",
    backgroundImage: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url("https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2000")',
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
    display: "flex",
    flexDirection: "column"
  };

  // --- API FUNCTIONS ---
  async function uploadPdf(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_URL}/upload_pdf`, { method: "POST", body: formData });
    if (!res.ok) throw new Error("Upload failed");
    return await res.json();
  }

  async function getStatus() {
    const res = await fetch(`${API_URL}/status`);
    return await res.json();
  }

  async function updateConfig(promptText: string) {
    await fetch(`${API_URL}/update_config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ custom_prompt: promptText }),
    });
  }

  async function startRecording() { await fetch(`${API_URL}/start`, { method: "POST" }); }
  async function stopRecording() {
    const res = await fetch(`${API_URL}/stop`, { method: "POST" });
    return await res.json();
  }

  // --- EFFECTS ---
  async function refreshStatusOnce() {
    try {
      const s = await getStatus();
      setIsRecording(s.is_recording);
      setTranscript(s.transcript_list || []);
      setFollowup(s.followup || "Waiting for insights...");
      setTransition(s.transition || "Waiting for insights...");
      const nextEmpathy = s.empathy || "Waiting for insights...";
      setEmpathy(nextEmpathy);
      // Determine if a new empathy/insight status has arrived
      if (nextEmpathy && nextEmpathy !== prevEmpathyRef.current && !/status:\s*normal/i.test(nextEmpathy)) {
        setHasNewEmpathy(true);
      }
      prevEmpathyRef.current = nextEmpathy;
    } catch (e) { console.error("Polling error", e); }
  }

  useEffect(() => {
    if (isRecording) { pollTimer.current = window.setInterval(refreshStatusOnce, 1000); }
    else { if (pollTimer.current) window.clearInterval(pollTimer.current); }
    return () => { if (pollTimer.current) window.clearInterval(pollTimer.current); };
  }, [isRecording]);

  useEffect(() => {
    let clockInterval: number;
    if (isRecording && startTime) {
      clockInterval = window.setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(clockInterval);
  }, [isRecording, startTime]);

  // --- HANDLERS ---
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const hide = message.loading("Reading PDF Strategy...", 0);
    try {
      const result = await uploadPdf(file);
      setPlanName(file.name);
      setActivePlanData(result.data);
      message.success("Strategy Loaded!");
    } catch (err) { message.error("Upload failed"); } finally { hide(); }
  };

  const VisualSteps = () => (
    <Steps direction="vertical" size="small" items={activePlanData?.interview_guides_collection[0].themes.map((t: any) => ({
      title: <Text strong style={{ fontSize: 14, color: "#1e293b" }}>{t.title}</Text>,
      description: (
        <div style={{ marginBottom: 12 }}>
          <Tag color="blue" style={{ fontSize: 10 }}>{t.objective}</Tag>
          <List size="small" dataSource={t.questions} renderItem={(q: any) => (
            <List.Item style={{ padding: "2px 0", border: "none" }}>
              <Text style={{ fontSize: 13, color: "#475569" }}>• {q.text}</Text>
            </List.Item>
          )} />
        </div>
      )
    }))} />
  );

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const statusUi = useMemo(() => {
    if (isStopping) return { badgeStatus: "processing" as const, tagColor: "gold", text: "Generating Scorecard…", blink: false };
    if (isRecording) return { badgeStatus: "processing" as const, tagColor: "red", text: "LIVE RECORDING", blink: true };
    return { badgeStatus: "default" as const, tagColor: "default", text: "System Ready", blink: false };
  }, [isRecording, isStopping]);

  if (showLanding) {
    return (
      <div style={sharedBackgroundStyle}>
        <Header style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(10px)", paddingInline: 40, display: "flex", alignItems: "center", borderBottom: "1px solid #f0f0f0" }}>
          <Title level={4} style={{ margin: 0, color: "#1890ff" }}>AI Interview Assistant</Title>
        </Header>
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ ...glassStyle, padding: "60px 40px", textAlign: "center", maxWidth: 700, boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
            <Title level={1} style={{ marginBottom: 16 }}>Welcome to AI Interview Assistant!</Title>
            <Text style={{ fontSize: 19, display: "block", marginBottom: 32, color: "#222", fontWeight: 500 }}>
              An intelligent companion providing real-time guidance and strategic support.
            </Text>
            <Button type="primary" size="large" icon={<ArrowRightOutlined />} onClick={() => setShowLanding(false)} style={{ height: 55, paddingInline: 40, borderRadius: 8, fontSize: 18, fontWeight: 'bold' }}>
              GET STARTED
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout className="app-shell" style={{ minHeight: "100vh", background: isRecording ? "#f0f2f5" : "transparent", ...( !isRecording ? sharedBackgroundStyle : {} ) }}>
      <Header style={{ background: isRecording ? "transparent" : "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "space-between", paddingInline: 24, height: 64 }}>
        <Space size={12}>
          <AudioOutlined style={{ fontSize: 20, color: "#1890ff" }} />
          <Title level={4} style={{ margin: 0 }}>AI Interview Assistant</Title>
        </Space>
        <Space>
          {isRecording && (
            <Tag color={elapsedSeconds > (allocatedTime * 60) ? "error" : "blue"} style={{ borderRadius: 999, fontWeight: 'bold' }}>
              {formatTime(elapsedSeconds)} / {formatTime(allocatedTime * 60)}
            </Tag>
          )}
          <Badge status={statusUi.badgeStatus} />
          <Tag color={statusUi.tagColor === "default" ? "#d9d9d9" : statusUi.tagColor}>{statusUi.text}</Tag>
        </Space>
      </Header>

      <Layout style={{ padding: "0 16px 16px", background: "transparent" }}>
        {!isRecording ? (
          /* SETUP VIEW */
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "calc(100vh - 100px)", width: "100%" }}>
            <Card style={{ ...glassStyle, width: 420, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
              <Title level={4} style={{ textAlign: "center", marginBottom: 24 }}>Setup & Configuration</Title>
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <div>
                  <Text type="secondary" style={{ fontWeight: 700, fontSize: 10 }}>1. INTERVIEW PLAN</Text>
                  <Input type="file" accept=".pdf" onChange={handlePdfUpload} size="small" style={{ marginTop: 4 }} />
                </div>
                <div>
                  <Text type="secondary" style={{ fontWeight: 700, fontSize: 10 }}>2. STRATEGIC DIRECTIVES</Text>
                  <Input.TextArea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} rows={3} style={{ marginTop: 4, fontSize: 11 }} />
                </div>
                <div>
                  <Text type="secondary" style={{ fontWeight: 700, fontSize: 10 }}>3. TARGET DURATION (MINS)</Text>
                  <Input type="number" value={allocatedTime} onChange={(e) => setAllocatedTime(Number(e.target.value))} size="small" suffix="min" style={{ marginTop: 4 }} />
                </div>
                <Button type="primary" block size="large" onClick={async () => { await startRecording(); setElapsedSeconds(0); setStartTime(Date.now()); setIsRecording(true); }}>
                  Start Interview
                </Button>
              </Space>
            </Card>
          </div>
        ) : (
          /* LIVE VIEW */
          <>
            <Sider width={320} style={{ ...glassStyle, padding: 16, marginRight: 16, height: "calc(100vh - 80px)", display: "flex", flexDirection: "column" }}>
              <Space direction="vertical" size={16} style={{ width: "100%", height: "100%" }}>
                <div>
                  <Text type="secondary" style={{ fontWeight: 700, fontSize: 10 }}>1. INTERVIEW PLAN</Text>
                  <Input type="file" disabled size="small" style={{ marginTop: 4 }} />
                  {planName && <Text type="secondary" style={{ fontSize: 10, display: "block", marginTop: 2 }}>Using: {planName}</Text>}
                </div>
                <div>
                  <Text 
                    style={{ 
                      fontWeight: 700, 
                      fontSize: 10, 
                      // Turns pinkish if a new insight arrives, otherwise stays grey
                      color: hasNewEmpathy ? "#e11d48" : "rgba(0, 0, 0, 0.45)", 
                      transition: "color 0.3s ease",
                      display: "block"
                    }}
                  >
                    2. STRATEGIC DIRECTIVES {hasNewEmpathy && "• NEW INSIGHT"}
                  </Text>
                  <Input.TextArea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} rows={3} style={{ marginTop: 4, fontSize: 11 }} />
                  <Button size="small" onClick={() => updateConfig(customPrompt)} block style={{ marginTop: 4 }}>Update Rules</Button>
                </div>
                <Button type="primary" danger block size="large" onClick={async () => { setIsStopping(true); const res = await stopRecording(); setScorecardMd(res.scorecard || ""); if (res.scorecard) setScorecardOpen(true); setIsRecording(false); setIsStopping(false); }}>
                  Stop & Score
                </Button>
                <Divider style={{ margin: "4px 0", fontSize: 10 }}>LIVE TRANSCRIPT</Divider>
                <div style={{ height: 500, overflowY: "auto", fontSize: "11px", lineHeight: "1.5", padding: "10px", background: "rgba(255,255,255,0.5)", borderRadius: 8, border: "1px solid #eee" }}>
                  {transcript.map((segment, index) => (
                    <span key={index} style={{ color: index === transcript.length - 1 ? "#000" : "#666", fontWeight: index === transcript.length - 1 ? "bold" : "normal" }}>{segment}{" "}</span>
                  ))}
                </div>
              </Space>
            </Sider>

            <Content style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Card title="🗺️ Strategy Mapping" style={{ ...glassStyle, flex: 1.2, overflow: "hidden" }} styles={{ body: { height: "100%", overflowY: "auto", padding: 16 }}}>
                {activePlanData ? <VisualSteps /> : <div style={{ textAlign: "center", padding: 40 }}><FilePdfOutlined style={{ fontSize: 30, color: "#ccc" }} /><br/><Text type="secondary">No plan loaded.</Text></div>}
              </Card>

              <Card title="💡 AI Coaching Insights" style={{ ...glassStyle, position: "relative", overflow: "hidden" }} styles={{ body: { padding: 0, minHeight: 320 } }} bordered={false}>
                <div style={{ padding: "10px 12px 12px" }}>
                  <MagicActionDeck hasNewEmpathy={hasNewEmpathy} onActionClick={(type) => {
                      let content = type === "deepen" ? followup : type === "shift" ? transition : empathy;
                      setActivePrompt({ type, content: content || "Generating..." });
                      if (type === "empathy") setHasNewEmpathy(false); // Reset status once viewed
                    }}
                  />
                  {activePrompt && <FloatingGlassCard type={activePrompt.type} text={activePrompt.content.trim()} onDismiss={() => setActivePrompt(null)} />}
                </div>
              </Card>
            </Content>
          </>
        )}
      </Layout>

      <Modal title="📊 Interview Scorecard" open={scorecardOpen} onCancel={() => setScorecardOpen(false)} width={800} footer={null}>
        <div style={{ maxHeight: "70vh", overflowY: "auto" }}><ReactMarkdown remarkPlugins={[remarkGfm]}>{scorecardMd}</ReactMarkdown></div>
      </Modal>
    </Layout>
  );
}