import { useState, useRef } from "react";
import type { ReactNode } from "react";

const API_ENDPOINT = "https://api.deepseek.com/v1/chat/completions";
const HARDCODED_API_KEY = "在这里填入你的sk-开头的DeepSeek Key";

const MODELS = [
  { id: "deepseek-chat", label: "DeepSeek V3", desc: "最强，推荐 🔥" },
  { id: "deepseek-reasoner", label: "DeepSeek R1", desc: "深度推理版" },
];

interface AnalysisResult {
  score: number;
  skills: string[];
  responsibilities: string[];
  requirements: string[];
  strengths: string[];
  gaps: string[];
  suggestion: string;
}

interface HistoryItem {
  id: string;
  date: string;
  jobTitle: string;
  score: number;
  resume: string;
  jd: string;
  result: AnalysisResult;
  model: string;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#4ade80" : score >= 60 ? "#facc15" : "#f87171";
  return (
    <div style={{ position: "relative", width: 140, height: 140, margin: "0 auto" }}>
      <svg width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#1e293b" strokeWidth="12" />
        <circle cx="70" cy="70" r={radius} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 36, fontWeight: 800, color, fontFamily: "monospace" }}>{score}</span>
        <span style={{ fontSize: 11, color: "#64748b", letterSpacing: 2, textTransform: "uppercase" }}>匹配度</span>
      </div>
    </div>
  );
}

function Tag({ text, color }: { text: string; color: string }) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: "#1e3a5f", text: "#60a5fa", border: "#2563eb33" },
    yellow: { bg: "#422006", text: "#fbbf24", border: "#d9770633" },
  };
  const c = colors[color] || colors["blue"];
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 99, background: c.bg, color: c.text, border: `1px solid ${c.border}`, fontSize: 12, margin: "3px 4px 3px 0", fontFamily: "monospace" }}>
      {text}
    </span>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: "20px 24px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 14 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "#4ade80" : score >= 60 ? "#facc15" : "#f87171";
  const bg = score >= 80 ? "#14532d33" : score >= 60 ? "#42200633" : "#450a0a33";
  return (
    <span style={{ fontSize: 13, fontWeight: 700, color, background: bg, padding: "2px 10px", borderRadius: 99, fontFamily: "monospace" }}>
      {score}分
    </span>
  );
}

function Spinner() {
  return (
    <span style={{ display: "inline-block", width: 13, height: 13, border: "2px solid #ffffff44", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
  );
}

export default function JobFit() {
  const [selectedModel, setSelectedModel] = useState<string>(MODELS[0].id);
  const [resume, setResume] = useState<string>("");
  const [pdfFileName, setPdfFileName] = useState<string>("");
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [jd, setJd] = useState<string>("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("input");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [optimizeSuggestion, setOptimizeSuggestion] = useState<string>("");
  const [optimizeLoading, setOptimizeLoading] = useState<boolean>(false);
  const [rewrittenResume, setRewrittenResume] = useState<string>("");
  const [rewriteLoading, setRewriteLoading] = useState<boolean>(false);
  const [showRewritten, setShowRewritten] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractPdfText = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const pdfjsLib = (window as any).pdfjsLib;
          if (!pdfjsLib) { reject(new Error("PDF解析库未加载，请刷新页面重试")); return; }
          const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => (item as any).str).join(" ");
            fullText += pageText + "\n";
          }
          resolve(fullText.trim());
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsArrayBuffer(file);
    });
  };

  const handlePdfUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) { setError("请上传PDF格式的文件"); return; }
    setPdfLoading(true);
    setError("");
    try {
      const text = await extractPdfText(file);
      if (!text || text.length < 10) throw new Error("PDF内容为空，请直接粘贴文字");
      setResume(text);
      setPdfFileName(file.name);
    } catch (e: unknown) {
      setError("PDF解析失败：" + (e instanceof Error ? e.message : "未知错误") + "，请直接粘贴简历文字");
    } finally {
      setPdfLoading(false);
    }
  };

  const callAPI = async (prompt: string): Promise<string> => {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Authorization": "Bearer " + HARDCODED_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ model: selectedModel, messages: [{ role: "user", content: prompt }], temperature: 0.3 })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "请求失败: " + res.status);
    }
    const data = await res.json();
    return data.choices[0].message.content.trim();
  };

  const analyze = async () => {
    if (!resume.trim()) { setError("请输入或上传简历内容"); return; }
    if (!jd.trim()) { setError("请输入职位描述 JD"); return; }
    setLoading(true); setError(""); setResult(null);
    setOptimizeSuggestion(""); setRewrittenResume(""); setShowRewritten(false);

    const prompt = [
      "你是专业求职顾问，请分析以下简历和职位描述的匹配程度。",
      "",
      "【简历内容】",
      resume,
      "",
      "【职位描述】",
      jd,
      "",
      "请只返回JSON格式，不要有其他任何文字、代码块标记或解释：",
      '{"score":85,"skills":["技能1","技能2"],"responsibilities":["职责1","职责2"],"requirements":["要求1","要求2"],"strengths":["亮点1","亮点2"],"gaps":["差距1","差距2"],"suggestion":"是否建议投递及详细理由"}'
    ].join("\n");

    try {
      let text = await callAPI(prompt);
      text = text.replace(/```json|```/g, "").trim();
      const parsed: AnalysisResult = JSON.parse(text);
      setResult(parsed);

      const titleMatch = jd.match(/职位[：:]\s*(.+)/);
      const jobTitle = titleMatch ? titleMatch[1].trim().slice(0, 20) : jd.slice(0, 20) + "...";
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        date: new Date().toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }),
        jobTitle, score: parsed.score, resume, jd, result: parsed, model: selectedModel,
      };
      setHistory(prev => [newItem, ...prev].slice(0, 20));
    } catch (e: unknown) {
      setError("分析失败：" + (e instanceof Error ? e.message : "未知错误"));
    } finally {
      setLoading(false);
    }
  };

  const getOptimizeSuggestion = async () => {
    if (!result) return;
    setOptimizeLoading(true);
    const prompt = [
      "你是专业求职顾问。根据以下信息，给出具体的简历优化建议。",
      "",
      "【当前简历】",
      resume,
      "",
      "【目标职位描述】",
      jd,
      "",
      "【匹配分析】",
      "- 匹配分数：" + result.score + "分",
      "- 差距：" + result.gaps.join("、"),
      "",
      "请给出5条具体、可操作的简历优化建议，每条建议说明：",
      "1. 哪里需要修改",
      "2. 如何修改",
      "3. 修改后能提升哪方面的匹配度",
      "",
      "用中文回答，格式清晰易读。"
    ].join("\n");
    try {
      const text = await callAPI(prompt);
      setOptimizeSuggestion(text);
    } catch (e: unknown) {
      setError("获取建议失败：" + (e instanceof Error ? e.message : "未知错误"));
    } finally {
      setOptimizeLoading(false);
    }
  };

  const getRewrittenResume = async () => {
    if (!result) return;
    setRewriteLoading(true);
    const prompt = [
      "你是专业简历优化师。请根据目标职位的要求，对简历进行优化改写。",
      "",
      "【原始简历】",
      resume,
      "",
      "【目标职位描述】",
      jd,
      "",
      "【已知差距】",
      result.gaps.join("、"),
      "",
      "要求：",
      "1. 保留原有真实经历，不要编造虚假内容",
      "2. 优化描述方式，突出与职位相关的技能和经验",
      "3. 调整关键词，使其更符合JD要求",
      "4. 优化措辞，使语言更专业有力",
      "5. 保持简历原有结构",
      "",
      "请直接输出优化后的完整简历内容，不要有额外说明。"
    ].join("\n");
    try {
      const text = await callAPI(prompt);
      setRewrittenResume(text);
      setShowRewritten(true);
    } catch (e: unknown) {
      setError("简历改写失败：" + (e instanceof Error ? e.message : "未知错误"));
    } finally {
      setRewriteLoading(false);
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setResume(item.resume); setJd(item.jd); setResult(item.result);
    setSelectedModel(item.model); setOptimizeSuggestion("");
    setRewrittenResume(""); setShowRewritten(false);
    setActiveTab("input");
  };

  const scoreColor = result ? (result.score >= 80 ? "#4ade80" : result.score >= 60 ? "#facc15" : "#f87171") : "#60a5fa";
  const suggestion = result
    ? result.score >= 80 ? "强烈建议投递 🚀"
    : result.score >= 60 ? "可以尝试投递 ✅"
    : "建议优化后再投 ⚠️"
    : "";

  const TABS = [
    { id: "input", label: "📝 分析" },
    { id: "optimize", label: "💡 优化建议" },
    { id: "rewrite", label: "✏️ AI改写简历" },
    { id: "history", label: "🕘 历史记录" + (history.length > 0 ? " (" + history.length + ")" : "") },
  ];

  const inputStyle = {
    width: "100%", background: "#0f172a", border: "1px solid #1e293b",
    borderRadius: 12, padding: "16px", color: "#e2e8f0", fontSize: 13,
    lineHeight: 1.7, resize: "vertical" as const, outline: "none",
    boxSizing: "border-box" as const, fontFamily: "inherit"
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020817", fontFamily: "'Inter', 'PingFang SC', sans-serif", color: "#e2e8f0" }}>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1e293b", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#020817", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📄</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>JobFit</div>
            <div style={{ fontSize: 11, color: "#475569", letterSpacing: 1 }}>AI 简历匹配分析器</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#64748b" }}>切换模型：</span>
          {MODELS.map((m) => (
            <button key={m.id} onClick={() => setSelectedModel(m.id)} title={m.desc} style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: selectedModel === m.id ? "1px solid #3b82f6" : "1px solid #1e293b",
              background: selectedModel === m.id ? "#1e3a5f" : "#0f172a",
              color: selectedModel === m.id ? "#60a5fa" : "#64748b",
            }}>{m.label}</button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ margin: "16px 32px", padding: "12px 16px", background: "#450a0a", border: "1px solid #dc262644", borderRadius: 10, color: "#f87171", fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ padding: "20px 32px 0" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #1e293b", marginBottom: 24 }}>
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: "10px 18px", border: "none", background: "none",
              color: activeTab === tab.id ? "#60a5fa" : "#475569",
              fontWeight: activeTab === tab.id ? 700 : 400,
              borderBottom: activeTab === tab.id ? "2px solid #3b82f6" : "2px solid transparent",
              cursor: "pointer", fontSize: 13,
            }}>{tab.label}</button>
          ))}
        </div>

        {/* ── 分析页（输入 + 结果内嵌） ── */}
        {activeTab === "input" && (
          <div style={{ paddingBottom: 40 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

              {/* 简历输入 */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: "#64748b", letterSpacing: 1, textTransform: "uppercase" }}>👤 我的简历</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {pdfFileName && <span style={{ fontSize: 11, color: "#4ade80" }}>✓ {pdfFileName}</span>}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={pdfLoading}
                      style={{ background: "#1e3a5f", border: "1px solid #2563eb44", borderRadius: 6, padding: "4px 12px", color: "#60a5fa", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                    >
                      {pdfLoading ? "解析中..." : "📎 上传PDF"}
                    </button>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }}
                  onChange={(e) => { if (e.target.files?.[0]) handlePdfUpload(e.target.files[0]); }} />
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.[0]) handlePdfUpload(e.dataTransfer.files[0]); }}
                  style={{ position: "relative" }}
                >
                  <textarea
                    value={resume}
                    onChange={(e) => { setResume(e.target.value); setPdfFileName(""); }}
                    placeholder={"粘贴简历文字，或点击上方按钮上传PDF...\n\n例如：\n姓名：张三\n求职意向：产品经理\n工作经历：\n- 阿里巴巴 产品经理 2年"}
                    style={{ ...inputStyle, height: 320, background: dragOver ? "#1e293b" : "#0f172a", border: dragOver ? "2px dashed #3b82f6" : "1px solid #1e293b" }}
                  />
                  {dragOver && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#1e293bcc", borderRadius: 12, pointerEvents: "none" }}>
                      <span style={{ color: "#60a5fa", fontWeight: 700, fontSize: 15 }}>📎 松开鼠标上传PDF</span>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#334155", marginTop: 6 }}>支持直接拖拽PDF到此区域</div>
              </div>

              {/* JD输入 */}
              <div>
                <label style={{ fontSize: 12, color: "#64748b", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 8 }}>💼 职位描述 JD</label>
                <textarea
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  placeholder={"粘贴招聘JD...\n\n例如：\n职位：产品经理\n\n职责：\n- 负责用户增长\n- 数据分析\n\n要求：\n- 3年以上经验"}
                  style={{ ...inputStyle, height: 320 }}
                />
              </div>
            </div>

            {/* 分析按钮 */}
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ marginBottom: 12, fontSize: 12, color: "#475569" }}>
                当前模型：
                <span style={{ color: "#60a5fa", fontWeight: 600 }}>{MODELS.find(m => m.id === selectedModel)?.label}</span>
                {"　|　"}
                {MODELS.find(m => m.id === selectedModel)?.desc}
              </div>
              <button onClick={analyze} disabled={loading} style={{
                background: loading ? "#1e293b" : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                border: "none", borderRadius: 12, padding: "14px 48px", color: "white", fontSize: 15, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 0 30px #3b82f644"
              }}>
                {loading
                  ? <span style={{ display: "flex", alignItems: "center", gap: 10 }}><Spinner />AI 分析中...</span>
                  : "✨ 开始匹配分析"
                }
              </button>
            </div>

            {/* 分析结果内嵌 */}
            {result && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{ flex: 1, height: 1, background: "#1e293b" }} />
                  <span style={{ fontSize: 13, color: "#475569", whiteSpace: "nowrap" }}>📊 分析结果</span>
                  <div style={{ flex: 1, height: 1, background: "#1e293b" }} />
                </div>

                <div style={{ background: "linear-gradient(135deg, #0f172a, #1e1b4b)", border: "1px solid #312e81", borderRadius: 20, padding: "32px", marginBottom: 20, display: "flex", alignItems: "center", gap: 40 }}>
                  <ScoreRing score={result.score} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor, marginBottom: 8 }}>{suggestion}</div>
                    <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7 }}>{result.suggestion}</div>
                    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                      <button onClick={() => setActiveTab("optimize")} style={{ background: "#1e3a5f", border: "1px solid #2563eb44", borderRadius: 8, padding: "8px 18px", color: "#60a5fa", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        💡 获取优化建议
                      </button>
                      <button onClick={() => setActiveTab("rewrite")} style={{ background: "#14532d33", border: "1px solid #16a34a44", borderRadius: 8, padding: "8px 18px", color: "#4ade80", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        ✏️ AI改写简历
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Section title="所需技能" icon="🛠">
                    <div>{result.skills?.map((s: string, i: number) => <Tag key={i} text={s} color="blue" />)}</div>
                  </Section>
                  <Section title="主要职责" icon="📋">
                    <div>{result.responsibilities?.map((r: string, i: number) => <Tag key={i} text={r} color="yellow" />)}</div>
                  </Section>
                  <Section title="任职要求" icon="📌">
                    <div>{result.requirements?.map((r: string, i: number) => <Tag key={i} text={r} color="blue" />)}</div>
                  </Section>
                  <Section title="你的优势亮点" icon="⭐">
                    <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
                      {result.strengths?.map((s: string, i: number) => (
                        <li key={i} style={{ fontSize: 13, marginBottom: 6, color: "#cbd5e1" }}>{s}</li>
                      ))}
                    </ul>
                  </Section>
                  <Section title="待补充的差距" icon="⚡">
                    <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
                      {result.gaps?.map((g: string, i: number) => (
                        <li key={i} style={{ fontSize: 13, marginBottom: 6, color: "#cbd5e1" }}>{g}</li>
                      ))}
                    </ul>
                  </Section>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 优化建议 ── */}
        {activeTab === "optimize" && (
          <div style={{ paddingBottom: 40 }}>
            {!result ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#475569" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>💡</div>
                <div>请先完成匹配分析，再获取优化建议</div>
                <button onClick={() => setActiveTab("input")} style={{ marginTop: 16, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 20px", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>
                  去分析
                </button>
              </div>
            ) : (
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>💡</span>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>简历优化建议</span>
                    <ScoreBadge score={result.score} />
                  </div>
                  <button onClick={getOptimizeSuggestion} disabled={optimizeLoading} style={{
                    background: optimizeLoading ? "#1e293b" : "linear-gradient(135deg, #3b82f6, #6366f1)",
                    border: "none", borderRadius: 8, padding: "8px 20px", color: "white", fontSize: 13, fontWeight: 600, cursor: optimizeLoading ? "not-allowed" : "pointer"
                  }}>
                    {optimizeLoading
                      ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Spinner />生成中...</span>
                      : optimizeSuggestion ? "重新生成" : "生成优化建议"
                    }
                  </button>
                </div>
                {optimizeSuggestion ? (
                  <div style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.9, whiteSpace: "pre-wrap", background: "#020817", borderRadius: 10, padding: "16px 20px", border: "1px solid #1e293b" }}>
                    {optimizeSuggestion}
                  </div>
                ) : (
                  <div style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: "30px 0" }}>
                    点击"生成优化建议"，AI将根据你的简历和目标JD给出具体改进方向
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── AI改写简历 ── */}
        {activeTab === "rewrite" && (
          <div style={{ paddingBottom: 40 }}>
            {!result ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#475569" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✏️</div>
                <div>请先完成匹配分析，再使用AI改写功能</div>
                <button onClick={() => setActiveTab("input")} style={{ marginTop: 16, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 20px", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>
                  去分析
                </button>
              </div>
            ) : (
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>✏️</span>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>AI 智能改写简历</span>
                  </div>
                  <button onClick={getRewrittenResume} disabled={rewriteLoading} style={{
                    background: rewriteLoading ? "#1e293b" : "linear-gradient(135deg, #059669, #10b981)",
                    border: "none", borderRadius: 8, padding: "8px 20px", color: "white", fontSize: 13, fontWeight: 600, cursor: rewriteLoading ? "not-allowed" : "pointer"
                  }}>
                    {rewriteLoading
                      ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Spinner />改写中...</span>
                      : rewrittenResume ? "重新改写" : "开始AI改写"
                    }
                  </button>
                </div>
                <div style={{ fontSize: 12, color: "#475569", marginBottom: 16 }}>
                  AI会在保留真实经历的基础上，优化描述方式和关键词，使简历更匹配目标职位
                </div>
                {rewrittenResume && showRewritten ? (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>原始简历</div>
                        <textarea readOnly value={resume} style={{ ...inputStyle, height: 480, color: "#64748b", resize: "none" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: "#4ade80", marginBottom: 8 }}>✨ AI优化版本</div>
                        <textarea readOnly value={rewrittenResume} style={{ ...inputStyle, height: 480, border: "1px solid #16a34a44", resize: "none" }} />
                      </div>
                    </div>
                    <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                      <button onClick={() => { setResume(rewrittenResume); setActiveTab("input"); }} style={{ background: "linear-gradient(135deg, #059669, #10b981)", border: "none", borderRadius: 8, padding: "10px 24px", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        采用此版本并重新分析
                      </button>
                      <button onClick={() => navigator.clipboard.writeText(rewrittenResume)} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "10px 24px", color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>
                        📋 复制优化版本
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: "30px 0" }}>
                    点击"开始AI改写"，生成针对该职位优化的简历版本
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 历史记录 ── */}
        {activeTab === "history" && (
          <div style={{ paddingBottom: 40 }}>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#475569" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🕘</div>
                <div>还没有历史记录，完成一次分析后会自动保存</div>
                <button onClick={() => setActiveTab("input")} style={{ marginTop: 16, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 20px", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>
                  开始分析
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <span style={{ fontSize: 14, color: "#64748b" }}>共 {history.length} 条记录（最多保存20条）</span>
                  <button onClick={() => setHistory([])} style={{ background: "#450a0a33", border: "1px solid #dc262633", borderRadius: 8, padding: "6px 14px", color: "#f87171", fontSize: 12, cursor: "pointer" }}>
                    清空记录
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {history.map((item) => (
                    <div key={item.id}
                      style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                      onClick={() => loadFromHistory(item)}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#3b82f6"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#1e293b"; }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <ScoreBadge score={item.score} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "#e2e8f0", marginBottom: 3 }}>{item.jobTitle}</div>
                          <div style={{ fontSize: 11, color: "#475569" }}>
                            {item.date}{"　|　"}{MODELS.find(m => m.id === item.model)?.label || item.model}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "#3b82f6" }}>查看详情</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        textarea:focus { border-color: #3b82f6 !important; }
        button:hover { opacity: 0.9; }
      `}</style>
    </div>
  );
}
