// test push


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
  PauseCircleOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { MagicActionDeck } from "./MagicActionDeck";
import { FloatingGlassCard } from "./FloatingGlassCard";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

export default function App() {
  // --- STATE ---
  const [customPrompt, setCustomPrompt] = useState("Keep suggestions concise.");
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

  // --- TIMER STATE ---
  const [allocatedTime, setAllocatedTime] = useState<number>(30); 
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0); 
  const [startTime, setStartTime] = useState<number | null>(null);

  // --- LOCKED INSIGHTS STATE ---
  const [activePrompt, setActivePrompt] = useState<{
    type: "deepen" | "shift" | "empathy";
    content: string; 
  } | null>(null);
  const [hasNewEmpathy, setHasNewEmpathy] = useState(false);

  const pollTimer = useRef<number | null>(null);
  const prevEmpathyRef = useRef<string>("");

  const API_URL = "http://localhost:8000";

  // --- UI HELPERS ---
  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const statusUi = useMemo(() => {
    if (isStopping) {
      return {
        badgeStatus: "processing" as const,
        tagColor: "gold",
        text: "Generating Scorecard…",
        blink: false,
      };
    }
    if (isRecording) {
      return {
        badgeStatus: "processing" as const,
        tagColor: "red",
        text: "LIVE RECORDING",
        blink: true,
      };
    }
    return {
      badgeStatus: "default" as const,
      tagColor: "default",
      text: "System Ready",
      blink: false,
    };
  }, [isRecording, isStopping]);

  // --- API FUNCTIONS ---
  async function uploadPdf(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_URL}/upload_pdf`, {
      method: "POST",
      body: formData,
    });
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

  async function startRecording() {
    await fetch(`${API_URL}/start`, { method: "POST" });
  }

  async function stopRecording() {
    const res = await fetch(`${API_URL}/stop`, { method: "POST" });
    return await res.json();
  }

  // --- EFFECTS & POLLING ---
  async function refreshStatusOnce() {
    try {
      const s = await getStatus();
      setIsRecording(s.is_recording);
      setTranscript(s.transcript_list || []);
      setFollowup(s.followup || "Waiting for insights...");
      setTransition(s.transition || "Waiting for insights...");
      const nextEmpathy = s.empathy || "Waiting for insights...";
      setEmpathy(nextEmpathy);

      if (
        nextEmpathy &&
        nextEmpathy !== prevEmpathyRef.current &&
        !/status:\s*normal/i.test(nextEmpathy)
      ) {
        setHasNewEmpathy(true);
      }
      prevEmpathyRef.current = nextEmpathy;
    } catch (e) {
      console.error("Polling error", e);
    }
  }

  useEffect(() => {
    refreshStatusOnce();
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      pollTimer.current = window.setInterval(refreshStatusOnce, 1000);
    } else {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
    }
    return () => {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
    };
  }, [isRecording]);

  // Upward Clock Timer Effect
  useEffect(() => {
    let clockInterval: number;
    if (isRecording && startTime) {
      clockInterval = window.setInterval(() => {
        const secondsPassed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedSeconds(secondsPassed);
      }, 1000);
    }
    return () => clearInterval(clockInterval);
  }, [isRecording, startTime]);

  useEffect(() => {
    if (!activePrompt) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActivePrompt(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activePrompt]);

  // --- EVENT HANDLERS ---
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const hide = message.loading("Reading PDF & Generating Strategy...", 0);
    try {
      const result = await uploadPdf(file);
      setPlanName(file.name);
      setActivePlanData(result.data); 
      message.success("Strategy Ready!");
    } catch (err) {
      message.error("Failed to process PDF");
    } finally {
      hide();
    }
  };

  async function onUpdateConfig() {
    try {
      await updateConfig(customPrompt);
      message.success("Instructions updated!");
    } catch (e: any) {
      message.error("Failed to update");
    }
  }

  async function onStart() {
    try {
      await startRecording();
      await refreshStatusOnce();
      
      // Reset and Start Clock
      setElapsedSeconds(0);
      setStartTime(Date.now());
      
      setIsRecording(true);
      message.success(`Interview started. Goal: ${allocatedTime} minutes.`);
    } catch (e: any) {
      message.error(e?.message ?? "Cannot connect to backend");
    }
  }

  async function onStop() {
    setIsStopping(true);
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    try {
      const res = await stopRecording();
      setScorecardMd(res.scorecard || "");
      if (res.scorecard) setScorecardOpen(true);
      await refreshStatusOnce();
      setIsRecording(false);
      setStartTime(null); // Stop clock
    } catch (e: any) {
      message.error("Error stopping");
    } finally {
      setIsStopping(false);
    }
  }

  return (
    <Layout className="app-shell">
      {/* --- HEADER --- */}
      <Header
        style={{
          background: "transparent",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          rowGap: 8,
          position: "relative",
          zIndex: 5,
          paddingInline: 24,
          paddingBlock: 16,
        }}
      >
        <Space size={16} style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 30% 20%, #fee2ff 0, #e0f2fe 40%, #1d4ed8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 30px rgba(37, 99, 235, 0.35)",
            }}
          >
            <AudioOutlined style={{ fontSize: 18, color: "white" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <Title level={4} style={{ margin: 0, fontSize: 16, lineHeight: 1.2 }}>
              AI Interview Assistant
            </Title>
            <Text type="secondary" style={{ fontSize: 11 }}>
              PDF-to-Strategy Engine
            </Text>
          </div>
        </Space>

        <Space style={{ flexShrink: 0 }}>
          {/* TIMER DISPLAY */}
          {isRecording && (
            <Tag 
              color={elapsedSeconds > (allocatedTime * 60) ? "error" : "blue"} 
              style={{ borderRadius: 999, fontWeight: 'bold' }}
            >
              DURATION: {formatTime(elapsedSeconds)} / {formatTime(allocatedTime * 60)}
            </Tag>
          )}
          <Badge status={statusUi.badgeStatus} />
          <Tag
            className={statusUi.blink ? "blink" : undefined}
            color={statusUi.tagColor === "default" ? "#e5e7eb" : statusUi.tagColor}
            style={{ borderRadius: 999, paddingInline: 12 }}
          >
            {statusUi.text}
          </Tag>
        </Space>
      </Header>

      <Layout style={{ padding: 16, paddingTop: 18, gap: 12, background: "transparent" }}>
        {/* --- SIDER --- */}
        <Sider
          width={280}
          theme="light"
          className="glass-panel"
          style={{
            borderRadius: 18,
            padding: 18,
            alignSelf: "flex-start",
            height: "fit-content",
            maxHeight: 700,
            overflow: "auto",
          }}
        >
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {/* 1. UPLOAD PDF */}
            <div>
              <Text type="secondary" style={{ fontWeight: 700, fontSize: 12 }}>
                1. INTERVIEW PLAN (PDF)
              </Text>
              <div style={{ marginTop: 8 }}>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  prefix={<FilePdfOutlined />}
                  style={{ fontSize: 12 }}
                />

                {planName && (
                  <div style={{ marginTop: 8 }}>
                    <Text
                      type="success"
                      style={{ marginTop: 8, display: "block", fontSize: 12, marginBottom: 4 }}
                    >
                      Loaded: <b>{planName}</b>
                    </Text>
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => setViewPlanOpen(true)}
                      block
                    >
                      View Generated Strategy
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* 2. INSTRUCTIONS */}
            <div>
              <Text type="secondary" style={{ fontWeight: 700, fontSize: 12 }}>
                2. AI INSTRUCTIONS
              </Text>
              <Input.TextArea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={4}
                style={{ marginTop: 8 }}
              />
              <Button onClick={onUpdateConfig} style={{ marginTop: 8 }} block>
                Update Config
              </Button>
            </div>

            <Divider style={{ margin: "4px 0 4px" }} />

            {/* 3. DURATION SETTING */}
            <div>
              <Text type="secondary" style={{ fontWeight: 700, fontSize: 12 }}>
                3. TARGET DURATION (MINS)
              </Text>
              <Input 
                type="number" 
                value={allocatedTime} 
                onChange={(e) => setAllocatedTime(Number(e.target.value))}
                disabled={isRecording}
                style={{ marginTop: 8 }}
                suffix="min"
              />
            </div>

            {/* 4. CONTROLS */}
            <div style={{ marginTop: 8, paddingBottom: 4 }}>
              {!isRecording ? (
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  size="large"
                  block
                  onClick={onStart}
                  disabled={isStopping}
                >
                  Start Recording
                </Button>
              ) : (
                <Button
                  danger
                  type="primary"
                  icon={<PauseCircleOutlined />}
                  size="large"
                  block
                  onClick={onStop}
                  loading={isStopping}
                >
                  Stop &amp; Score
                </Button>
              )}
            </div>
          </Space>
        </Sider>

        {/* --- MAIN CONTENT --- */}
        <Content style={{ padding: 0, overflow: "auto" }}>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card
              title="📜 Live Transcript"
              extra={<Text type="secondary">Helvetica Style</Text>}
              className="glass-panel"
              styles={{ body: { minHeight: 220, borderRadius: 16 } }}
              bordered={false}
            >
              <div className="transcript-container">
                {transcript.length === 0 && (
                  <Text type="secondary">Waiting for speech...</Text>
                )}
                {transcript.map((segment, index) => {
                  // Bold and increase size for the newly added transcript
                  const isLast = index === transcript.length - 1;
                  return (
                    <span
                      key={index}
                      className={isLast ? "transcript-latest" : "transcript-segment"}
                    >
                      {segment}{" "}
                    </span>
                  );
                })}
              </div>
            </Card>

            <Card
              title="AI Coaching"
              extra={<Text type="secondary">Tap a card to surface a ready-to-use prompt</Text>}
              className="glass-panel"
              styles={{ body: { padding: 0, minHeight: 320 } }}
              bordered={false}
            >
              <div style={{ padding: "10px 12px 12px" }}>
                <MagicActionDeck
                  hasNewEmpathy={hasNewEmpathy}
                  onActionClick={(type) => {
                    // LOCK CONTENT: Determine current AI text and save it to activePrompt
                    let selectedContent = "";
                    if (type === "deepen") selectedContent = followup;
                    else if (type === "shift") selectedContent = transition;
                    else if (type === "empathy") selectedContent = empathy;

                    // Fallback logic
                    if (!selectedContent || /waiting for insights/i.test(selectedContent)) {
                      selectedContent = 
                        type === "deepen" ? "Can you walk me through a specific example?" :
                        type === "shift" ? "I'd love to shift gears and talk about the next theme." :
                        "I can hear this mattered to you. Could you share more?";
                    }

                    // Save BOTH type and content to state to "lock" it
                    setActivePrompt({ type, content: selectedContent });

                    if (type === "empathy") {
                      setHasNewEmpathy(false);
                    }
                  }}
                />

                {activePrompt && (
                  <FloatingGlassCard
                    type={activePrompt.type}
                    text={activePrompt.content.trim()} 
                    onDismiss={() => setActivePrompt(null)}
                  />
                )}
              </div>
            </Card>
          </Space>
        </Content>
      </Layout>

      {/* --- PLAN VIEW MODAL (RESTORED) --- */}
      <Modal
        title="🗺️ AI-Generated Interview Strategy"
        open={viewPlanOpen}
        onCancel={() => setViewPlanOpen(false)}
        footer={[
          <Button key="close" onClick={() => setViewPlanOpen(false)}>
            Close
          </Button>,
        ]}
        width={700}
      >
        {activePlanData ? (
          <Tabs
            defaultActiveKey="1"
            items={[
              {
                key: "1",
                label: "👀 Visual Overview",
                children: (
                  <Steps
                    direction="vertical"
                    size="small"
                    current={-1}
                    items={activePlanData.interview_guides_collection[0].themes.map(
                      (theme: any) => ({
                        title: <Text strong>{theme.title}</Text>,
                        description: (
                          <div style={{ marginTop: 8, marginBottom: 24 }}>
                            <Tag color="geekblue" style={{ marginBottom: 8 }}>
                              {theme.objective}
                            </Tag>
                            <List
                              size="small"
                              dataSource={theme.questions}
                              renderItem={(q: any) => (
                                <List.Item
                                  style={{
                                    padding: "4px 0",
                                    fontSize: 13,
                                    border: "none",
                                  }}
                                >
                                  <Text type="secondary" style={{ marginRight: 8 }}>
                                    •
                                  </Text>
                                  {q.text}
                                </List.Item>
                              )}
                            />
                          </div>
                        ),
                      })
                    )}
                  />
                ),
              },
              {
                key: "2",
                label: "⚙️ Raw JSON Code",
                children: (
                  <div
                    style={{
                      maxHeight: "50vh",
                      overflow: "auto",
                      background: "#1e293b",
                      color: "#e2e8f0",
                      padding: 16,
                      borderRadius: 8,
                      fontFamily: "monospace",
                      fontSize: 12,
                    }}
                  >
                    <pre style={{ margin: 0 }}>
                      {JSON.stringify(activePlanData, null, 2)}
                    </pre>
                  </div>
                ),
              },
            ]}
          />
        ) : (
          <div style={{ padding: 20, textAlign: "center" }}>
            <Text type="secondary">No interview plan loaded yet.</Text>
          </div>
        )}
      </Modal>

      {/* --- SCORECARD MODAL (RESTORED) --- */}
      <Modal
        title="📊 Interview Scorecard"
        open={scorecardOpen}
        onCancel={() => setScorecardOpen(false)}
        footer={[
          <Button key="close" onClick={() => setScorecardOpen(false)}>
            Close
          </Button>,
        ]}
        width={900}
        styles={{ body: { maxHeight: "70vh", overflow: "auto" } }}
      >
        {scorecardMd ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{scorecardMd}</ReactMarkdown>
        ) : (
          <Text type="secondary">Generating report…</Text>
        )}
      </Modal>
    </Layout>
  );
}