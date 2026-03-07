import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";

const API_ENDPOINT = "https://api.deepseek.com/v1/chat/completions";
const HARDCODED_API_KEY = "sk-a557d052a0c149da8de1b59249694c2a";

const MODELS = [
  { id: "deepseek-chat", label: "DeepSeek V3", desc: "最强，推荐 🔥" },
  { id: "deepseek-reasoner", label: "DeepSeek R1", desc: "深度推理版" },
];

const DEFAULT_PROMPTS = {
  structurePdf: `你是专业简历解析专家。以下是从PDF中提取的原始文本，由于PDF排版问题，文字顺序可能混乱、重复或错位。

【PDF原始文本】
{{rawText}}

请仔细阅读并还原出正确的简历内容，严格按照以下格式输出：

---

# 基本信息
姓名：XXX
联系方式：XXX
求职意向：XXX

---

# 教育背景

## 学校名称（最近一段）
- 时间：XXXX-XX ～ XXXX-XX
- 专业/学历：XXX
- 备注：（如核心课程、GPA、奖学金等，没有则省略）

## 学校名称（更早）
...

---

# 工作经历

## 公司名称（最近一段）
- 时间：XXXX-XX ～ XXXX-XX
- 职位：XXX
- 所在部门：XXX（没有则省略）

### 项目：项目名称A（如果该公司工作是项目制，在公司下列出）
- 项目背景：XXX（1-2句，说明为什么做这个项目）
- 负责内容：
  1. XXX
  2. XXX
- 项目成果：XXX（量化数据，如有）

### 项目：项目名称B
...

（如果该公司不是项目制，直接列工作内容）
- 负责内容：
  1. XXX
  2. XXX
- 工作成果：XXX

## 公司名称（更早）
...

---

# 个人项目 / 独立项目
（仅填写不属于任何公司的个人项目、开源项目、副业项目等）

## 项目名称
- 时间：XXXX-XX ～ XXXX-XX
- 项目描述：XXX
- 负责内容：
  1. XXX
- 成果：XXX

---

# 技能
- 技术栈：XXX
- 工具：XXX
- 语言：XXX

---

# 其他
（证书、获奖、自我评价等，没有则省略整个分类）

---

【重要规则】
1. 公司内部的项目，必须放在对应公司下，用"### 项目：xxx"表示，不要单独提取为个人项目
2. 个人项目是指完全独立于公司之外的项目，才放在"# 个人项目"分类
3. 如果原文中某段经历不确定是公司项目还是个人项目，优先判断为公司项目（因为大多数简历是项目制公司经历）
4. 去除重复的文字（PDF解析常见重复问题）
5. 严格还原原文信息，不要推断、补充或编造
6. 直接输出格式化后的简历，不要有任何说明文字`,

  analyze: `# Role
你是一位顶级招聘专家、人才评估顾问，同时具备互联网大厂 ATS（Applicant Tracking System）筛选逻辑设计经验，长期负责 AI / 互联网岗位的人才评估与简历筛选。
你的任务是从 **招聘决策与ATS筛选逻辑** 的视角，对候选人与岗位之间的匹配度进行结构化评估。
---
# Input
## Candidate Resume
{{resume}}
## Job Description
{{jd}}
---
# Objective
基于岗位JD与候选人简历信息，对候选人的 **岗位匹配度（Job Fit）** 进行系统化分析，并输出 **结构化评估结果**，用于招聘筛选或自动化投递系统。
---
# Evaluation Framework（内部推理步骤，不要输出）
### Step 1：提取岗位核心要求
从JD中识别并结构化提取以下信息：
- 核心技能要求（Hard Skills / Tools / Tech Stack）
- 关键职责（Key Responsibilities）
- 必要经验（项目经验 / 行业经验）
- 教育背景要求
- 工作年限要求
- 其他隐含能力（如产品思维、数据分析能力、跨团队协作能力等）
### Step 2：解析候选人简历
从简历中提取以下信息：
- 技能与技术栈
- 项目经验与成果
- 行业背景
- 工作经历与职责
- 教育背景
- 工作年限
特别注意：
- 区分 **公司工作经历中的项目** 与 **候选人个人项目**
- 识别量化成果（如增长%、用户量、效率提升等）
### Step 3：逐项匹配分析
对比 JD 与简历，判断以下内容：
- 技能匹配度
- 项目经验相关性
- 行业经验匹配度
- 教育背景匹配度
- 工作年限匹配度
### Step 4：量化评分（Total = 100）
评分标准：
| 维度 | 权重 |
|---|---|
| 技能匹配 | 30 |
| 项目经验相关性 | 30 |
| 行业经验 | 25 |
| 教育背景 | 5 |
| 工作年限 | 10 |
评分原则：
- 高度匹配：90–100
- 较高匹配：75–89
- 一般匹配：60–74
- 低匹配：<60
### Step 5：招聘决策判断
基于评分与关键能力匹配度，给出推荐等级：
- **强烈推荐（Strong Recommend）**
- **可以考虑（Consider）**
- **不太匹配（Weak Fit）**
---
# Output Requirements
仅返回 **合法 JSON**，禁止输出任何解释、文本说明、Markdown、代码块或分析过程。
JSON字段定义：
- score：候选人与岗位的综合匹配评分（0–100）
- skills：候选人匹配JD的关键技能（最多5个）
- responsibilities：候选人与JD匹配的主要职责（最多5个）
- requirements：JD中的关键岗位要求（最多5个）
- strengths：候选人的主要优势（最多5个）
- gaps：候选人与岗位要求之间的差距（最多5个）
- suggestion：招聘建议（包含推荐等级 + 简要原因）
---
# Output Format
返回格式必须严格符合以下 JSON 结构：
{"score":85,"skills":["技能1","技能2","技能3"],"responsibilities":["职责1","职责2"],"requirements":["要求1","要求2"],"strengths":["亮点1","亮点2"],"gaps":["差距1","差距2"],"suggestion":"Strong Recommend / Consider / Weak Fit：简要说明原因"}
注意：JSON必须可解析，不允许出现多余字段，不允许输出任何额外文本`,

  optimize: `# Role
你是一位资深HR招聘专家，长期负责互联网与AI行业岗位招聘，每天需要筛选大量简历，熟悉HR初筛逻辑与ATS（Applicant Tracking System）筛选机制。
你的目标是帮助候选人优化简历，使其 **更容易通过HR初筛与ATS关键词匹配**。
---
# Input
## 当前简历
{{resume}}
## 目标职位描述（JD）
{{jd}}
## 当前匹配分析
- 匹配分数：{{score}}
- 主要差距：{{gaps}}
---
# Task
基于岗位JD要求与当前匹配分析，对候选人的简历提出 **针对性的优化建议**，目标是提升：
- ATS关键词匹配率
- HR初筛通过率
- JD相关经验的突出程度
- 简历整体可读性与专业度
优化建议必须 **聚焦最影响匹配度的关键问题**。
---
# Optimization Strategy（内部分析逻辑，不要输出）
在给出建议前，请按以下逻辑进行分析：
1. 识别JD关键词（技能关键词、核心职责关键词、项目/经验关键词、行业或领域关键词）
2. 评估简历匹配情况（是否缺少JD关键技能、是否缺少相关项目经验表达、是否存在无关或低价值内容、是否缺少成果或量化结果）
3. 确定最重要的优化方向（强化JD核心关键词、优化项目经验描述、增强成果表达、提升结构清晰度、删除无关信息）
---
# Resume Writing Rules
建议必须遵循成果导向表达方式：动词 + 行动 + 结果（可量化）
示例：❌ 负责数据分析工作 ✔ 搭建数据分析流程，使运营效率提升30%
---
# Suggestion Design Rules
每条建议应满足：明确指出问题、提供可执行的修改步骤、说明修改后的价值、标注优先级。建议数量：5条
---
# Output Format（严格遵守）
仅输出 **JSON数组**，不得包含任何额外文字、解释或Markdown标记。
[{"index":1,"title":"建议标题（10字以内）","location":"需修改的简历位置（例如：工作经历-XX公司、项目经验、技能栏）","problem":"当前存在的具体问题（1-2句）","action":"具体修改步骤，用换行分隔每一步","impact":"修改后将如何提升岗位匹配度（1句）","priority":"high"}]
priority 只能是 high / medium / low。必须返回合法JSON数组，必须包含5条建议，不允许输出代码块、解释说明或分析过程。`,

  rewrite: `# Role
你是一位专业的简历优化顾问，擅长根据岗位JD与优化建议，对候选人简历进行精准改写，使其更符合招聘筛选逻辑与ATS关键词匹配规则。
你的目标是在 **不改变事实、不编造经历** 的前提下，提升简历的岗位相关性、表达质量与关键词匹配度。
---
# Input
## 原始简历
{{resume}}
## 目标职位描述（JD）
{{jd}}
## 需要执行的优化建议
{{suggestions}}
---
# Task
根据提供的优化建议，对候选人简历进行针对性改写与优化。优化后的简历应：
- 更突出与目标岗位相关的技能与经验
- 使用更专业、成果导向的表达方式
- 强化JD中的关键能力关键词
- 提升整体可读性与HR初筛通过率
---
# Editing Rules
1. 严格执行优化建议：每条建议都必须在对应位置落实修改
2. 保持真实信息：不得编造经历、项目或成果，不得虚构技能或工作内容
3. 保留原有结构：不改变简历整体结构（教育、工作经历、项目经历等模块）
4. 强化岗位相关性：优先突出与JD最相关的经验，合理调整描述顺序与表达方式
5. 关键词优化：适度引入JD中的关键技能或职责关键词，保证表达自然，不进行关键词堆砌
6. 成果导向表达：优先使用 动词+行动+结果（尽可能量化） 示例：❌ 负责用户增长工作 ✔ 设计并执行用户增长策略，使注册用户数提升25%
7. 能力缺失处理：如果JD中存在简历未提及的重要能力，不得编造相关经历，只能标注"该能力在当前简历中未体现"或建议候选人补充真实经验
---
# Editing Scope
允许优化：工作经历描述、项目经历描述、技能列表、关键词表达、语句结构、成果表达方式
不允许改变：公司名称、时间线、学历信息、实际经历内容
---
# Output Format
【重要】你必须严格按照原始简历的 Markdown 结构输出，只修改文字内容，不改变任何标题层级和格式符号。

具体规则：
- 原始简历中用 # 开头的行（如 # 教育背景）→ 输出时必须保留 # 开头
- 原始简历中用 ## 开头的行（如 ## 武汉哈乐沃德科技有限公司）→ 输出时必须保留 ## 开头
- 原始简历中用 ### 开头的行（如 ### 项目一：XXX）→ 输出时必须保留 ### 开头
- 原始简历中用 - 开头的行 → 输出时必须保留 - 开头
- 原始简历中的普通段落行 → 输出时保持普通段落

换句话说：**每一行的格式前缀（#、##、###、-）必须与原始简历完全一致，你只能修改前缀后面的文字内容。**

禁止：
- 禁止删除任何 #、##、### 前缀
- 禁止把 ## 公司名改成普通文字行
- 禁止输出 Markdown 代码块
- 禁止输出任何说明或解释`
};

interface AnalysisResult {
  score: number;
  skills: string[];
  responsibilities: string[];
  requirements: string[];
  strengths: string[];
  gaps: string[];
  suggestion: string;
}

interface OptimizeSuggestion {
  index: number;
  title: string;
  location: string;
  problem: string;
  action: string;
  impact: string;
  priority: "high" | "medium" | "low";
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
  optimizeSuggestions: OptimizeSuggestion[];
  rewrittenResume: string;
}

function OptimizeCard({ item }: { item: OptimizeSuggestion }) {
  const priorityMap = {
    high: { label: "高优先级", color: "#f87171", bg: "#450a0a55", border: "#f8717144" },
    medium: { label: "中优先级", color: "#facc15", bg: "#42200655", border: "#facc1544" },
    low: { label: "低优先级", color: "#60a5fa", bg: "#1e3a5f55", border: "#60a5fa44" },
  };
  const p = priorityMap[item.priority] || priorityMap["medium"];
  const actionSteps = item.action
    .split(/\n/)
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0);

  return (
    <div style={{
      background: "#080d1a",
      border: `1px solid ${p.border}`,
      borderLeft: `3px solid ${p.color}`,
      borderRadius: 12, padding: "18px 20px", marginBottom: 14
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#e2e8f0" }}>
          建议 {item.index}：{item.title}
        </span>
        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: p.bg, color: p.color, border: `1px solid ${p.border}`, fontWeight: 600 }}>
          {p.label}
        </span>
      </div>

      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12, color: "#64748b", flexShrink: 0 }}>📍 修改位置</span>
        <span style={{ fontSize: 12, color: "#f87171", fontWeight: 700, background: "#450a0a66", padding: "3px 10px", borderRadius: 6, border: "1px solid #f8717133" }}>
          {item.location}
        </span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 6 }}>⚠ 当前问题</div>
        <div style={{ fontSize: 13, color: "#f87171", lineHeight: 1.7, paddingLeft: 8, borderLeft: "2px solid #f8717133" }}>
          {item.problem}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 8 }}>✏ 如何修改</div>
        <div style={{ background: "#0f172a", borderRadius: 8, padding: "10px 14px" }}>
          {actionSteps.map((step: string, i: number) => (
            <div key={i} style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.8, display: "flex", gap: 8, alignItems: "flex-start", marginBottom: i < actionSteps.length - 1 ? 6 : 0 }}>
              <span style={{ color: "#3b82f6", fontWeight: 700, flexShrink: 0, minWidth: 18, fontSize: 12, marginTop: 2 }}>{i + 1}.</span>
              <span>{step.replace(/^\d+[.、．]\s*/, "")}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
        <span style={{ fontSize: 11, color: "#64748b", flexShrink: 0, marginTop: 1 }}>✅ 预期效果</span>
        <span style={{ fontSize: 12, color: "#4ade80", lineHeight: 1.7 }}>{item.impact}</span>
      </div>
    </div>
  );
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

function PromptEditor({ prompts, onChange }: {
  prompts: typeof DEFAULT_PROMPTS;
  onChange: (key: keyof typeof DEFAULT_PROMPTS, val: string) => void;
}) {
  const [activePrompt, setActivePrompt] = useState<keyof typeof DEFAULT_PROMPTS>("analyze");
  const promptMeta = [
    { key: "structurePdf" as const, label: "🗂 PDF结构化", desc: "PDF上传后，AI自动将乱文本整理为标准简历结构（新增）" },
    { key: "analyze" as const, label: "📊 匹配分析", desc: "分析简历与JD匹配度，返回结构化JSON数据" },
    { key: "optimize" as const, label: "💡 优化建议", desc: "生成5条结构化建议，返回JSON数组" },
    { key: "rewrite" as const, label: "✏️ AI改写简历", desc: "基于优化建议对简历全面改写（{{suggestions}}自动注入）" },
  ];
  const varHints: Record<keyof typeof DEFAULT_PROMPTS, string[]> = {
    structurePdf: ["{{rawText}} ← PDF原始乱文本"],
    analyze: ["{{resume}}", "{{jd}}"],
    optimize: ["{{resume}}", "{{jd}}", "{{score}}", "{{gaps}}"],
    rewrite: ["{{resume}}", "{{jd}}", "{{suggestions}} ← 自动注入优化建议"],
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 20, padding: "14px 18px", background: "#0f172a", border: "1px solid #f59e0b44", borderRadius: 12, fontSize: 13, color: "#94a3b8", lineHeight: 1.8 }}>
        ⚙️ 在此查看和修改每个模块的 AI 提示词，修改后立即生效。
        <span style={{ color: "#f59e0b" }}> 「改写简历」会自动将优化建议注入 <code style={{ background: "#1e293b", padding: "1px 6px", borderRadius: 4, fontSize: 11 }}>{"{{suggestions}}"}</code>，请勿删除。</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {promptMeta.map((p) => (
          <button key={p.key} onClick={() => setActivePrompt(p.key)} style={{
            padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
            border: activePrompt === p.key ? "1px solid #3b82f6" : "1px solid #1e293b",
            background: activePrompt === p.key ? "#1e3a5f" : "#0f172a",
            color: activePrompt === p.key ? "#60a5fa" : "#475569",
          }}>{p.label}</button>
        ))}
      </div>
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: "20px 24px" }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 14, marginBottom: 4 }}>{promptMeta.find(p => p.key === activePrompt)?.label}</div>
          <div style={{ fontSize: 12, color: "#475569", marginBottom: 10 }}>{promptMeta.find(p => p.key === activePrompt)?.desc}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#64748b" }}>可用变量：</span>
            {varHints[activePrompt].map((v, i) => (
              <span key={i} style={{ fontSize: 11, background: "#1e293b", color: "#94a3b8", padding: "2px 8px", borderRadius: 6, fontFamily: "monospace" }}>{v}</span>
            ))}
          </div>
        </div>
        <textarea
          value={prompts[activePrompt]}
          onChange={(e) => onChange(activePrompt, e.target.value)}
          style={{ width: "100%", background: "#020817", border: "1px solid #1e293b", borderRadius: 10, padding: "14px 16px", color: "#e2e8f0", fontSize: 12, lineHeight: 1.8, resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "monospace", minHeight: 380 }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={() => onChange(activePrompt, DEFAULT_PROMPTS[activePrompt])}
            style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 16px", color: "#94a3b8", fontSize: 12, cursor: "pointer" }}>
            🔄 恢复默认
          </button>
          <button onClick={() => navigator.clipboard.writeText(prompts[activePrompt])}
            style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 16px", color: "#94a3b8", fontSize: 12, cursor: "pointer" }}>
            📋 复制 Prompt
          </button>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────
// Landing Page Component
// ─────────────────────────────────────────────
function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [hovered, setHovered] = useState<string>("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const features = [
    {
      icon: "📊",
      title: "智能匹配分析",
      desc: "AI 从招聘决策视角深度解析简历与 JD 的匹配度，给出0-100精准评分，识别核心差距。",
      color: "#3b82f6",
    },
    {
      icon: "💡",
      title: "针对性优化建议",
      desc: "5条结构化优化建议，精准定位到简历的具体位置，告诉你改什么、怎么改、改完有什么效果。",
      color: "#8b5cf6",
    },
    {
      icon: "✏️",
      title: "AI 一键改写",
      desc: "基于优化建议对简历进行针对性改写，强化 ATS 关键词匹配，提升 HR 初筛通过率。",
      color: "#06b6d4",
    },
    {
      icon: "📄",
      title: "导出精美简历",
      desc: "改写后的简历直接在预览窗口编辑调整，一键导出专业 PDF，可上传证件照。",
      color: "#10b981",
    },
  ];

  const steps = [
    { num: "01", title: "上传简历 + 粘贴 JD", desc: "支持 PDF / 图片导入，AI 自动识别并结构化简历内容" },
    { num: "02", title: "获取匹配评分", desc: "从技能、项目经验、行业经验多维度评分，清晰看到优势与差距" },
    { num: "03", title: "一键优化改写", desc: "AI 生成优化建议并改写简历，让每一份投递都更有针对性" },
    { num: "04", title: "导出投递", desc: "在线编辑预览，调整排版字号，导出 PDF 直接投递" },
  ];

  const faqs = [
    { q: "我的简历数据安全吗？", a: "所有数据仅在你的浏览器本地处理，历史记录保存在本地，不会上传到任何服务器。" },
    { q: "支持哪些简历格式？", a: "支持 PDF、PNG、JPG、WEBP 等格式上传，也可以直接粘贴文字。AI 会自动识别并整理结构。" },
    { q: "适合哪些人使用？", a: "适合任何正在求职的人，尤其是需要针对不同岗位定制简历、希望提升 ATS 通过率的求职者。" },
    { q: "使用需要付费吗？", a: "目前完全免费使用，直接开始即可，无需注册。" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#030712",
      fontFamily: "'DM Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif",
      color: "#e2e8f0",
      overflowX: "hidden",
    }}>

      {/* ── Navbar ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        padding: "0 64px",
        height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: scrolled ? "rgba(3,7,18,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
        transition: "all 0.3s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>✦</div>
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.3px" }}>JobFit</span>
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: 1,
            color: "#3b82f6", background: "rgba(59,130,246,0.12)",
            padding: "2px 7px", borderRadius: 4, border: "1px solid rgba(59,130,246,0.25)",
            marginLeft: 4,
          }}>AI</span>
        </div>
        <button
          onClick={onEnter}
          style={{
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            border: "none", borderRadius: 8,
            padding: "8px 22px", color: "#fff",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 0 20px rgba(99,102,241,0.35)",
            transition: "all 0.2s",
          }}
        >开始使用 →</button>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "120px 24px 80px",
        position: "relative", overflow: "hidden",
        textAlign: "center",
      }}>
        {/* Background glow blobs */}
        <div style={{
          position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)",
          width: 700, height: 400,
          background: "radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", top: "30%", left: "20%",
          width: 300, height: 300,
          background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", top: "20%", right: "15%",
          width: 250, height: 250,
          background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Grid pattern overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 100%)",
        }} />

        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)",
          borderRadius: 100, padding: "6px 16px", marginBottom: 32,
          fontSize: 12, color: "#93c5fd", fontWeight: 500, letterSpacing: 0.5,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6", display: "inline-block", boxShadow: "0 0 8px #3b82f6" }} />
          AI 驱动的简历优化工具
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: "clamp(36px, 6vw, 72px)",
          fontWeight: 900, lineHeight: 1.08,
          letterSpacing: "-2px", marginBottom: 24,
          maxWidth: 780,
        }}>
          <span style={{ color: "#f1f5f9" }}>每一次投递，</span>
          <br />
          <span style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>都精准命中岗位</span>
        </h1>

        {/* Sub */}
        <p style={{
          fontSize: "clamp(15px, 2vw, 18px)", color: "#64748b",
          lineHeight: 1.75, maxWidth: 540, marginBottom: 48,
        }}>
          上传简历 + 粘贴 JD，AI 秒级分析匹配度<br />
          给出针对性优化建议，一键改写，直接导出 PDF 投递
        </p>

        {/* CTA */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={onEnter}
            onMouseEnter={() => setHovered("main-cta")}
            onMouseLeave={() => setHovered("")}
            style={{
              background: hovered === "main-cta"
                ? "linear-gradient(135deg, #2563eb, #7c3aed)"
                : "linear-gradient(135deg, #3b82f6, #6366f1)",
              border: "none", borderRadius: 12,
              padding: "16px 40px", color: "#fff",
              fontSize: 16, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 0 40px rgba(99,102,241,0.4), 0 4px 24px rgba(0,0,0,0.3)",
              transition: "all 0.25s ease",
              transform: hovered === "main-cta" ? "translateY(-2px)" : "translateY(0)",
              letterSpacing: "-0.2px",
            }}
          >
            免费开始分析 →
          </button>
          <button
            onClick={onEnter}
            onMouseEnter={() => setHovered("sec-cta")}
            onMouseLeave={() => setHovered("")}
            style={{
              background: hovered === "sec-cta" ? "rgba(255,255,255,0.06)" : "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12, padding: "16px 32px",
              color: "#94a3b8", fontSize: 16, fontWeight: 500,
              cursor: "pointer", transition: "all 0.25s ease",
              backdropFilter: "blur(8px)",
            } as React.CSSProperties}
          >
            查看功能介绍
          </button>
        </div>

        {/* Social proof */}
        <div style={{
          marginTop: 56, display: "flex", alignItems: "center", gap: 12,
          color: "#475569", fontSize: 13,
        }}>
          <div style={{ display: "flex" }}>
            {["🎓","💼","🚀","⭐","✦"].map((e, i) => (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: "50%",
                background: `hsl(${220 + i * 20}, 60%, 20%)`,
                border: "2px solid #030712",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, marginLeft: i === 0 ? 0 : -8,
              }}>{e}</div>
            ))}
          </div>
          <span>已帮助 <strong style={{ color: "#94a3b8" }}>1,000+</strong> 求职者优化简历</span>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          color: "#334155", fontSize: 11, letterSpacing: 2,
          animation: "bounce 2s infinite",
        }}>
          <span>SCROLL</span>
          <div style={{ width: 1, height: 32, background: "linear-gradient(to bottom, #334155, transparent)" }} />
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: "80px 64px 100px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 3,
            color: "#475569", textTransform: "uppercase", marginBottom: 16,
          }}>核心功能</div>
          <h2 style={{
            fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800,
            letterSpacing: "-1px", color: "#f1f5f9", marginBottom: 16,
          }}>求职全流程，一站搞定</h2>
          <p style={{ color: "#475569", fontSize: 16, maxWidth: 480, margin: "0 auto" }}>
            从分析到改写到导出，每一步都有 AI 协助
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 20,
        }}>
          {features.map((f, i) => (
            <div
              key={i}
              onMouseEnter={() => setHovered("feat-" + i)}
              onMouseLeave={() => setHovered("")}
              style={{
                background: hovered === "feat-" + i
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(255,255,255,0.02)",
                border: `1px solid ${hovered === "feat-" + i ? f.color + "44" : "rgba(255,255,255,0.06)"}`,
                borderRadius: 16, padding: "28px 24px",
                transition: "all 0.25s ease",
                cursor: "default",
                transform: hovered === "feat-" + i ? "translateY(-4px)" : "translateY(0)",
                boxShadow: hovered === "feat-" + i ? `0 8px 32px ${f.color}18` : "none",
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: f.color + "18",
                border: `1px solid ${f.color}33`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, marginBottom: 18,
              }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#e2e8f0", marginBottom: 10, letterSpacing: "-0.2px" }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{
        padding: "80px 64px",
        background: "rgba(255,255,255,0.01)",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 3,
              color: "#475569", textTransform: "uppercase", marginBottom: 16,
            }}>使用流程</div>
            <h2 style={{
              fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800,
              letterSpacing: "-1px", color: "#f1f5f9",
            }}>4步，从普通简历到精准投递</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 2 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ position: "relative", padding: "0 16px" }}>
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div style={{
                    position: "absolute", top: 20, right: -1,
                    width: 2, height: "calc(100% - 40px)",
                    background: "linear-gradient(to bottom, rgba(59,130,246,0.3), transparent)",
                    display: "none",
                  }} />
                )}
                <div style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: 2,
                  color: "#3b82f6", marginBottom: 14, fontFamily: "monospace",
                }}>{s.num}</div>
                <div style={{
                  width: 40, height: 2,
                  background: "linear-gradient(to right, #3b82f6, transparent)",
                  marginBottom: 16,
                }} />
                <div style={{ fontWeight: 700, fontSize: 15, color: "#e2e8f0", marginBottom: 10 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.7 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Score preview card ── */}
      <section style={{ padding: "100px 64px", maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 24, padding: "48px 40px",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: -60, right: -60,
            width: 200, height: 200,
            background: "radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)",
            borderRadius: 8, padding: "6px 14px", marginBottom: 24,
            fontSize: 12, color: "#34d399", fontWeight: 600,
          }}>✦ 示例评分结果</div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 40, flexWrap: "wrap" }}>
            {/* Score ring mockup */}
            <div style={{ position: "relative", width: 120, height: 120, flexShrink: 0 }}>
              <svg width="120" height="120" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                <circle cx="60" cy="60" r="52" fill="none"
                  stroke="url(#scoreGrad)" strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 52 * 0.82} ${2 * Math.PI * 52}`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#e2e8f0", lineHeight: 1 }}>82</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>匹配度</div>
              </div>
            </div>

            <div style={{ textAlign: "left", flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#60a5fa", marginBottom: 8 }}>较高匹配 · 建议投递</div>
              <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
                候选人在产品思维和数据分析方面与岗位高度契合，建议补充 AI 工具使用经验以提升竞争力。
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["产品思维", "数据分析", "用户增长", "Prompt 工程"].map((tag, i) => (
                  <span key={i} style={{
                    background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)",
                    borderRadius: 6, padding: "4px 10px",
                    fontSize: 12, color: "#93c5fd",
                  }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{
        padding: "60px 64px 80px",
        maxWidth: 800, margin: "0 auto",
      }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 3,
            color: "#475569", textTransform: "uppercase", marginBottom: 16,
          }}>FAQ</div>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-1px", color: "#f1f5f9" }}>常见问题</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {faqs.map((faq, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12, padding: "20px 24px",
            }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0", marginBottom: 8 }}>Q：{faq.q}</div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>A：{faq.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{
        padding: "80px 64px",
        textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(99,102,241,0.1), transparent)",
          pointerEvents: "none",
        }} />
        <h2 style={{
          fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900,
          letterSpacing: "-1.5px", color: "#f1f5f9", marginBottom: 16,
        }}>现在就开始优化你的简历</h2>
        <p style={{ color: "#64748b", fontSize: 16, marginBottom: 40 }}>免费使用 · 无需注册 · 3分钟完成分析</p>
        <button
          onClick={onEnter}
          onMouseEnter={() => setHovered("final-cta")}
          onMouseLeave={() => setHovered("")}
          style={{
            background: hovered === "final-cta"
              ? "linear-gradient(135deg, #2563eb, #7c3aed)"
              : "linear-gradient(135deg, #3b82f6, #6366f1)",
            border: "none", borderRadius: 14,
            padding: "18px 56px", color: "#fff",
            fontSize: 17, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 0 60px rgba(99,102,241,0.35), 0 8px 32px rgba(0,0,0,0.4)",
            transition: "all 0.25s ease",
            transform: hovered === "final-cta" ? "translateY(-3px)" : "translateY(0)",
            letterSpacing: "-0.3px",
          }}
        >
          免费开始使用 →
        </button>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.04)",
        padding: "32px 64px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 16,
        color: "#334155", fontSize: 13,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12,
          }}>✦</div>
          <span style={{ fontWeight: 700, color: "#475569" }}>JobFit</span>
        </div>
        <div>© 2025 JobFit · AI 求职助手 · 让每一次投递都精准命中</div>
        <div style={{ display: "flex", gap: 24, fontSize: 12 }}>
          <span style={{ cursor: "pointer", color: "#475569" }}>隐私政策</span>
          <span style={{ cursor: "pointer", color: "#475569" }}>使用条款</span>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(6px); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #030712; scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}

export default function App() {
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [selectedModel, setSelectedModel] = useState<string>(MODELS[0].id);
  const [resume, setResume] = useState<string>("");
  const [rawPdfText, setRawPdfText] = useState<string>("");
  const [pdfStructured, setPdfStructured] = useState<boolean>(false);
  const [pdfFileName, setPdfFileName] = useState<string>("");
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [pdfStructuring, setPdfStructuring] = useState<boolean>(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>("");   // PDF blob URL 用于弹窗预览
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false); // 控制弹窗
  const [jd, setJd] = useState<string>("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("input");
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('jobfit_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // 每次 history 变化时自动保存到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem('jobfit_history', JSON.stringify(history));
    } catch {}
  }, [history]);
  const [optimizeSuggestions, setOptimizeSuggestions] = useState<OptimizeSuggestion[]>([]);
  const [optimizeRaw, setOptimizeRaw] = useState<string>("");
  const [optimizeLoading, setOptimizeLoading] = useState<boolean>(false);
  const [rewrittenResume, setRewrittenResume] = useState<string>("");
  const [rewriteLoading, setRewriteLoading] = useState<boolean>(false);
  const [pdfExporting, setPdfExporting] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [prompts, setPrompts] = useState({ ...DEFAULT_PROMPTS });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updatePrompt = (key: keyof typeof DEFAULT_PROMPTS, val: string) => {
    setPrompts(prev => ({ ...prev, [key]: val }));
  };

  const fillPrompt = (template: string, vars: Record<string, string>) => {
    let out = template;
    for (const [k, v] of Object.entries(vars)) {
      out = out.split(`{{${k}}}`).join(v);
    }
    return out;
  };

  const extractPdfText = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const pdfjsLib = (window as any).pdfjsLib;
          if (!pdfjsLib) { reject(new Error("PDF解析库未加载，请刷新页面")); return; }
          const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map((item: any) => item.str).join(" ") + "\n";
          }
          resolve(fullText.trim());
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsArrayBuffer(file);
    });
  };

  const handlePdfUpload = async (file: File) => {
    const isImg = /\.(png|jpg|jpeg|webp|bmp)$/i.test(file.name);
    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf && !isImg) { setError("请上传PDF或图片格式（PNG/JPG等）"); return; }
    // 图片格式：直接用AI识别文字，不走PDF.js
    if (isImg) {
      setPdfLoading(true); setError(""); setPdfStructured(false);
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(URL.createObjectURL(file));
      setPdfFileName(file.name);
      try {
        const base64 = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res((r.result as string).split(",")[1]);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        setPdfLoading(false); setPdfStructuring(true);
        const structRes = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: { "Authorization": "Bearer " + HARDCODED_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "user", content: [
            { type: "image_url", image_url: { url: "data:" + file.type + ";base64," + base64 } },
            { type: "text", text: fillPrompt(prompts.structurePdf, { rawText: "[图片简历，请直接识别并结构化输出]" }) }
          ]}], temperature: 0.1 })
        });
        if (!structRes.ok) throw new Error("图片识别失败");
        const structData = await structRes.json();
        setResume(structData.choices[0].message.content.trim());
        setPdfStructured(true);
      } catch(e: unknown) {
        setError("图片识别失败：" + (e instanceof Error ? e.message : "未知错误"));
      } finally { setPdfLoading(false); setPdfStructuring(false); }
      return;
    }
    setPdfLoading(true); setError(""); setPdfStructured(false);

    // 生成 blob URL 供弹窗预览（不走解析，直接保存原文件）
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl); // 释放旧的
    const blobUrl = URL.createObjectURL(file);
    setPdfPreviewUrl(blobUrl);

    try {
      // Step 1: PDF.js 提取原始文本
      const rawText = await extractPdfText(file);
      if (!rawText || rawText.length < 10) throw new Error("PDF内容为空，请直接粘贴文字");
      setRawPdfText(rawText);
      setPdfFileName(file.name);
      setPdfLoading(false);

      // Step 2: AI 结构化整理（关键新增步骤）
      setPdfStructuring(true);
      const structurePrompt = fillPrompt(prompts.structurePdf, { rawText });
      const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Authorization": "Bearer " + HARDCODED_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "user", content: structurePrompt }], temperature: 0.1 })
      });
      if (!res.ok) throw new Error("AI结构化请求失败");
      const data = await res.json();
      const structured = data.choices[0].message.content.trim();
      setResume(structured);
      setPdfStructured(true);
    } catch (e: unknown) {
      // 如果AI结构化失败，退回原始文本
      if (rawPdfText) {
        setResume(rawPdfText);
      }
      setError("PDF结构化失败，已使用原始文本：" + (e instanceof Error ? e.message : "未知错误"));
    } finally {
      setPdfLoading(false);
      setPdfStructuring(false);
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
    setOptimizeSuggestions([]); setOptimizeRaw(""); setRewrittenResume("");
    const prompt = fillPrompt(prompts.analyze, { resume, jd });
    try {
      let text = await callAPI(prompt);
      text = text.replace(/```json|```/g, "").trim();
      const parsed: AnalysisResult = JSON.parse(text);
      setResult(parsed);
      const titleMatch = jd.match(/职位[：:]\s*(.+)/);
      const jobTitle = titleMatch ? titleMatch[1].trim().slice(0, 20) : jd.slice(0, 20) + "...";
      setHistory(prev => [{
        id: Date.now().toString(),
        date: new Date().toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }),
        jobTitle, score: parsed.score, resume, jd, result: parsed, model: selectedModel,
        optimizeSuggestions: [],  // 分析时先存空，优化后自动更新
        rewrittenResume: "",
      }, ...prev].slice(0, 20));
    } catch (e: unknown) {
      setError("分析失败：" + (e instanceof Error ? e.message : "未知错误"));
    } finally { setLoading(false); }
  };

  const getOptimizeSuggestion = async () => {
    if (!result) return;
    setOptimizeLoading(true);
    const prompt = fillPrompt(prompts.optimize, { resume, jd, score: String(result.score), gaps: result.gaps.join("、") });
    try {
      let text = await callAPI(prompt);
      text = text.replace(/```json|```/g, "").trim();
      setOptimizeRaw(text);
      const parsed: OptimizeSuggestion[] = JSON.parse(text);
      setOptimizeSuggestions(parsed);
      // 自动更新历史记录中的优化建议
      setHistory(prev => prev.map(item =>
        item.resume === resume && item.jd === jd ? { ...item, optimizeSuggestions: parsed } : item
      ));
    } catch (e: unknown) {
      setOptimizeSuggestions([]);
      setError("建议解析失败，已退回纯文本。如需卡片格式，请检查⚙️Prompt编辑中返回格式是否正确。");
    } finally { setOptimizeLoading(false); }
  };

  const getRewrittenResume = async () => {
    if (!result) return;
    if (optimizeSuggestions.length === 0) {
      setError("请先在「优化建议」页生成建议，AI改写将基于这些建议进行");
      setActiveTab("optimize");
      return;
    }
    setRewriteLoading(true);

    // ── 把原始简历预处理成标准 Markdown，确保 AI 改写时有格式可以保留 ──
    const SECTION_KEYWORDS_RE = /^(基本信息|个人信息|教育背景|教育经历|工作经历|工作经验|项目经历|项目经验|个人项目|独立项目|专业技能|技能|语言能力|自我评价|荣誉奖项|证书|实习经历|校园经历|社会实践)/;
    const CO_KEYWORDS_RE = /公司|集团|有限|股份|学院|大学|研究院|工作室|[Ii]nc\.|[Ll]td/;
    const PROJ_RE = /^项目[一二三四五六七八九十\d]*[：:\s]/;

    const normalizeResume = (text: string): string => {
      const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      return lines.map(l => {
        // 已有标准格式，直接保留
        if (/^#{1,3}\s/.test(l) || /^[-*]\s/.test(l)) return l;
        const clean = l.replace(/^[#*\s]+/, "").replace(/[*]+$/, "").trim();
        // 一级分区标题
        if (SECTION_KEYWORDS_RE.test(clean) && clean.length <= 12 && !/[：:]/.test(clean))
          return `# ${clean}`;
        // 公司/学校名 → ##
        if (CO_KEYWORDS_RE.test(clean) && !/[：:]/.test(clean) && clean.length <= 30)
          return `## ${clean}`;
        // 项目名 → ###
        if (PROJ_RE.test(clean))
          return `### ${clean}`;
        return l;
      }).join("\n");
    };

    const normalizedResume = normalizeResume(resume);
    const suggestionsText = optimizeSuggestions.map(s =>
      `建议${s.index}【${s.title}】\n- 修改位置：${s.location}\n- 当前问题：${s.problem}\n- 修改操作：${s.action}\n- 预期效果：${s.impact}`
    ).join("\n\n");
    const prompt = fillPrompt(prompts.rewrite, { resume: normalizedResume, jd, suggestions: suggestionsText });
    try {
      const text = await callAPI(prompt);
      setRewrittenResume(text);
      // 自动更新历史记录中的改写结果
      setHistory(prev => prev.map(item =>
        item.resume === resume && item.jd === jd ? { ...item, rewrittenResume: text } : item
      ));
    } catch (e: unknown) {
      setError("简历改写失败：" + (e instanceof Error ? e.message : "未知错误"));
    } finally { setRewriteLoading(false); }
  };

  // ── 简历文本 → 干净 HTML（去除所有 Markdown 符号）──


  const exportToPdf = () => {
    setPdfExporting(true);

    const ci = (t: string) => t
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/#+\s*/g, "");

    const buildBodyHtml = (text: string): { headerHtml: string; bodyHtml: string } => {
      const lines = text.split("\n").map((l: string) => l.trim());
      type Block = { title: string; lines: string[] };
      const blocks: Block[] = [];
      let cur: Block | null = null;

      // 已知简历分区关键词
      const SECTION_RE = /^(基本信息|个人信息|教育背景|教育经历|工作经历|工作经验|项目经历|项目经验|个人项目|独立项目|专业技能|技能栏|技能|语言能力|自我评价|荣誉奖项|证书|实习经历|校园经历|社会实践)/;

      const cleanLine = (l: string) => l.replace(/^[#*\s]+/, "").replace(/[*]+$/, "").trim();

      const isSectionTitle = (line: string): boolean => {
        const c = cleanLine(line);
        // 1. # 一级标题
        if (/^#\s/.test(line) && !/^#{2}/.test(line)) return true;
        // 2. **加粗** 整行 且 匹配已知分区（≤12字，无冒号）
        if (/^\*\*[^*]+\*\*$/.test(line) && SECTION_RE.test(c) && c.length <= 12) return true;
        // 3. 纯文字整行 且 匹配已知分区（≤10字，无标点）
        if (SECTION_RE.test(c) && c.length <= 10 && !/[：:，,。.！!？?（(）)]/.test(c) && !/^[-*]/.test(line)) return true;
        return false;
      };

      for (const line of lines) {
        if (!line || /^---+$/.test(line)) continue;
        if (isSectionTitle(line)) {
          if (cur) blocks.push(cur);
          cur = { title: cleanLine(line), lines: [] };
        } else {
          if (!cur) cur = { title: "__header__", lines: [] };
          cur.lines.push(line);
        }
      }
      if (cur) blocks.push(cur);

      const isEmpty = (ls: string[]) => {
        if (!ls.length) return true;
        const j = ls.join("").replace(/\s/g, "");
        if (j.length < 3) return true;
        if (/^(没有|省略|无|暂无|略|XXX|N\/A)$/.test(j)) return true;
        return false;
      };

      let headerHtml = "";
      let bodyHtml = "";

      for (const block of blocks) {
        const isHeaderBlock = block.title === "__header__" || /^(基本信息|个人信息)/.test(block.title);
        if (isHeaderBlock) {
          const allLines = block.lines;
          // 姓名：有"姓名："前缀，或首个无冒号的短行（≤10字，不是联系方式行）
          const nameMatch = allLines.find((l: string) => {
            const c = l.replace(/^[-*#\s*]+/, "").replace(/\*+$/, "").trim();
            return /^姓名[：:]/.test(c) ||
              (!/[：:]/.test(c) && c.length > 0 && c.length <= 10 &&
               !/^(联系|求职|电话|邮|手机|地址|核心|性别|年龄)/.test(c));
          });
          const nameText = nameMatch
            ? nameMatch.replace(/^[-*#\s*]+/, "").replace(/\*+$/, "").replace(/^姓名[：:]\s*/, "").trim()
            : "";
          const metaLines = allLines
            .filter((l: string) => l !== nameMatch)
            .map((l: string) => l.replace(/^[-*\s*]+/, "").replace(/\*+$/, "").replace(/^\d+\.\s+/, "").trim())
            .filter((l: string) => l.length > 0);
          headerHtml = `<div class="h-name">${ci(nameText)}</div><div class="h-meta">${metaLines.map((l: string) => ci(l)).join("<br>")}</div>`;
          continue;
        }
        if (isEmpty(block.lines)) continue;
        bodyHtml += `<div class="sec-title">${ci(block.title)}</div>`;
        let inList = false;
        for (const line of block.lines) {
          const isLi = /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line);
          const isH2 = /^#{2}\s/.test(line) && !/^#{3}/.test(line);
          const isH3 = /^#{3}\s/.test(line);
          if (!isLi && inList) { bodyHtml += "</ul>"; inList = false; }
          if (isH2) {
            bodyHtml += `<div class="co-title">${ci(line.replace(/^#+\s+/, ""))}</div>`;
          } else if (isH3) {
            bodyHtml += `<div class="proj-title">${ci(line.replace(/^#+\s+/, ""))}</div>`;
          } else if (isLi) {
            const liText = ci(line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "")).trim();
            if (!liText) continue;
            if (!inList) { bodyHtml += "<ul>"; inList = true; }
            bodyHtml += `<li>${liText}</li>`;
          } else {
            bodyHtml += `<p>${ci(line)}</p>`;
          }
        }
        if (inList) bodyHtml += "</ul>";
      }
      return { headerHtml, bodyHtml };
    };

    const { headerHtml, bodyHtml } = buildBodyHtml(rewrittenResume);

    const printWindow = window.open("", "_blank", "width=1000,height=860");
    if (!printWindow) { setError("请允许弹出窗口以导出PDF"); setPdfExporting(false); return; }

    printWindow.document.write(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>优化简历</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:#dde1e8;font-family:"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif;text-align:left}

  #toolbar{
    position:fixed;top:0;left:0;right:0;z-index:999;
    background:#1e293b;color:#e2e8f0;
    padding:7px 14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;
    font-size:12px;box-shadow:0 2px 10px #0009;
  }
  #toolbar .ttl{font-weight:700;font-size:13px}
  #toolbar button{padding:5px 11px;border-radius:5px;border:none;cursor:pointer;font-size:11px;font-weight:600}
  .btn-blue{background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff}
  .btn-gray{background:#334155;color:#cbd5e1}
  .btn-green{background:linear-gradient(135deg,#059669,#10b981);color:#fff}
  .btn-orange{background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff}
  .fmt-btn{padding:3px 7px;border-radius:4px;border:1px solid #475569;background:#1e293b;color:#e2e8f0;cursor:pointer;font-size:12px;line-height:1.4}
  .fmt-btn:hover{background:#334155}
  #scale-wrap{display:flex;align-items:center;gap:5px;margin-left:auto}
  #scale-wrap label{font-size:10px;color:#94a3b8}
  #scale-inp{width:42px;padding:3px 4px;border-radius:4px;border:1px solid #475569;background:#0f172a;color:#e2e8f0;font-size:11px;text-align:center}
  #page-info{font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;background:#0f172a}
  #edit-tip{font-size:10px;color:#fbbf24;display:none}

  #page-wrap{margin-top:48px;padding:20px 0 40px;display:flex;justify-content:center}

  /* ── A4纸 ── */
  #resume-paper{width:210mm;background:#fff;box-shadow:0 4px 20px #0004;position:relative}
  #paper-inner{padding:10mm 13mm 10mm 13mm}

  /* ── 顶部header：左侧居中文字 + 右上角绝对定位照片 ── */
  #header-block{
    display:flex;
    flex-direction:row;
    align-items:flex-start;  /* 照片和姓名顶部对齐 */
    justify-content:space-between;
    padding-bottom:6px;
    margin-bottom:6px;
    border-bottom:2px solid #111;
    gap:5mm;
  }
  #header-text{
    flex:1;
    text-align:center;
    padding-top:2mm;  /* 姓名稍微下移，视觉上更协调 */
  }
  .h-name{font-size:18pt;font-weight:800;letter-spacing:4px;margin-bottom:4px;text-align:center}
  .h-meta{font-size:8pt;color:#333;line-height:1.9;text-align:center}

  /* 照片：flex右侧同行，不再绝对定位 */
  #photo-wrap{
    flex-shrink:0;
    display:flex;flex-direction:column;align-items:center;
  }
  #photo-area{
    width:24mm;height:31mm;
    border:1.5px dashed #bbb;border-radius:3px;
    background:#f4f6f9;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    cursor:pointer;overflow:hidden;position:relative;
  }
  #photo-area:hover{border-color:#3b82f6;background:#eff6ff}
  #photo-img{width:100%;height:100%;object-fit:cover;display:none}
  .ph-hint{display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none}
  .ph-icon{font-size:14px}
  .ph-txt{font-size:6pt;color:#888;text-align:center;line-height:1.4}
  #photo-del{display:none;position:absolute;top:2px;right:2px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:14px;height:14px;font-size:9px;cursor:pointer;line-height:14px;text-align:center;z-index:5}
  #photo-file{display:none}
  #photo-tip{font-size:6.5pt;color:#3b82f6;margin-top:2px;cursor:pointer;text-align:center}

  /* ── 正文（全部左对齐） ── */
  #resume-body{text-align:left}
  #paper-inner{text-align:left}
  .sec-title{font-weight:800;border-bottom:1.5px solid #111;padding-bottom:1px;margin:7px 0 4px;letter-spacing:1.5px;text-align:left;font-size:10.5pt}
  .co-title{font-weight:700;margin:5px 0 1px;text-align:left;font-size:10pt}
  .proj-title{font-weight:700;margin:4px 0 1px;text-align:left;font-size:9.5pt}
  .proj-label{font-weight:700;color:#333;margin:2px 0 1px;text-align:left}
  p{margin:1px 0;color:#222;text-align:left}
  ul{padding-left:13px;margin:1px 0 2px;text-align:left}
  li{color:#222;margin-bottom:1px;text-align:left}
  strong{font-weight:700}
  code{background:#f3f4f6;padding:0 3px;border-radius:2px}

  /* ── 可编辑高亮 ── */
  [contenteditable="true"]{outline:none;caret-color:#3b82f6}
  #resume-body::selection,#header-text::selection,
  #resume-body *::selection,#header-text *::selection{
    background:rgba(59,130,246,0.3);
  }
  #header-text[contenteditable="true"],
  #resume-body[contenteditable="true"]{
    outline:none;
    caret-color:#3b82f6;
    border-radius:4px;
  }
  #resume-body[contenteditable="true"]:focus,
  #header-text[contenteditable="true"]:focus{
    box-shadow:0 0 0 2px rgba(59,130,246,0.15);
  }

  @media print{
    #toolbar,.ph-hint,#photo-tip,#photo-del{display:none!important}
    #photo-area{border:none;background:transparent;cursor:default}
    #photo-img{display:block!important}
    #page-wrap{margin-top:0;padding:0}
    html,body{background:white}
    #resume-paper{box-shadow:none}
    [contenteditable]{outline:none!important;background:none!important;box-shadow:none!important;cursor:default!important}
    #__sel_highlight__{background:transparent!important}
    @page{margin:0;size:A4}
  }
</style>
</head>
<body>

<div id="toolbar">
  <span class="ttl">📄 简历预览</span>
  <span id="page-info">计算中...</span>

  <!-- 字号压缩 -->
  <div id="scale-wrap">
    <label>字号</label>
    <input type="number" id="scale-inp" value="9.5" min="6" max="11" step="0.5">
    <span style="color:#94a3b8;font-size:10px">pt</span>
    <button class="btn-gray" onclick="autoFit(1)" title="自动缩小字号使内容压缩至1页">🗜 压缩至1页</button>
    <button class="btn-gray" onclick="applySize(9.5)" title="还原到默认字号 9.5pt">↺ 还原字号</button>
  </div>

  <!-- 编辑开关 -->
  <button class="btn-orange" onclick="toggleEdit()" id="edit-btn">✏️ 开启编辑</button>

  <!-- 富文本格式工具栏（编辑模式时显示） -->
  <div id="fmt-bar" style="display:none;align-items:center;gap:4px;background:#0f172a;padding:3px 8px;border-radius:6px;border:1px solid #334155">
    <span style="font-size:10px;color:#64748b">格式：</span>
    <button class="fmt-btn" onmousedown="event.preventDefault()" onclick="execFmt('bold')" title="加粗 Ctrl+B"><b style="font-size:12px">B</b></button>
    <button class="fmt-btn" onmousedown="event.preventDefault()" onclick="execFmt('italic')" title="斜体 Ctrl+I"><i style="font-size:12px">I</i></button>
    <button class="fmt-btn" onmousedown="event.preventDefault()" onclick="execFmt('underline')" title="下划线 Ctrl+U"><u style="font-size:12px">U</u></button>
    <span style="font-size:10px;color:#64748b">字号:</span>
    <button class="fmt-btn" onmousedown="stepFontSize(event,-0.1)" title="减小字号 0.1pt" style="font-size:13px;padding:2px 8px">－</button>
    <span id="fsize-display" style="min-width:40px;text-align:center;font-size:11px;color:#e2e8f0;padding:2px 4px;background:#0f172a;border:1px solid #475569;border-radius:4px;display:inline-block">—</span>
    <button class="fmt-btn" onmousedown="stepFontSize(event,0.1)" title="增大字号 0.1pt" style="font-size:13px;padding:2px 8px">＋</button>
    <button class="fmt-btn" onmousedown="event.preventDefault()" onclick="execFmt('removeFormat')" title="清除所选格式" style="font-size:10px">✕格式</button>
  </div>

  <!-- 导出 -->
  <button class="btn-blue" onclick="exportPdf()" title="导出为PDF文件">📥 导出PDF</button>


  <span id="edit-tip">✏️ 编辑中：可自由增删改、跨行选择，支持格式调整，确认后关闭编辑再导出</span>
</div>

<div id="page-wrap">
<div id="resume-paper">
<div id="paper-inner" style="text-align:left">

  <!-- Header：居中姓名信息 + 右上角照片 -->
  <div id="header-block">
    <div id="header-text">
      ${headerHtml}
    </div>
    <div id="photo-wrap">
      <div id="photo-area" onclick="triggerPhoto()">
        <img id="photo-img" src="" alt="证件照">
        <div class="ph-hint">
          <span class="ph-icon">📷</span>
          <span class="ph-txt">点击上传<br>证件照</span>
        </div>
        <button id="photo-del" onclick="delPhoto(event)">×</button>
      </div>
      <div id="photo-tip" onclick="triggerPhoto()">更换照片</div>
    </div>
  </div>

  <input type="file" id="photo-file" accept="image/*">

  <!-- 正文 -->
  <div id="resume-body" style="text-align:left">
${bodyHtml}
  </div>

</div>
</div>
</div>

<script>
  const paper    = document.getElementById('resume-paper');
  const inner    = document.getElementById('paper-inner');
  const scaleInp = document.getElementById('scale-inp');
  const pageInfo = document.getElementById('page-info');
  const photoImg = document.getElementById('photo-img');
  const photoFile= document.getElementById('photo-file');
  const photoDel = document.getElementById('photo-del');
  const A4_PX    = 297*(96/25.4);
  let editMode   = false;

  // ── 字号压缩（真实修改字体，打印生效） ──
  function applySize(pt) {
    pt = Math.max(6, Math.min(11, pt));
    scaleInp.value = pt;
    const r = inner;
    r.style.fontSize   = pt+'pt';
    r.style.lineHeight = pt<=7.5?'1.4':pt<=8.5?'1.5':'1.6';
    const ratio = pt/9.5;
    document.querySelectorAll('.sec-title').forEach(el=>{
      el.style.margin = (7*ratio).toFixed(1)+'px 0 '+(3*ratio).toFixed(1)+'px';
      el.style.fontSize = (pt+0.5)+'pt';
    });
    document.querySelectorAll('.co-title,.proj-title').forEach(el=>{
      el.style.margin = (4*ratio).toFixed(1)+'px 0 '+(1*ratio).toFixed(1)+'px';
      el.style.fontSize = pt+'pt';
    });
    document.querySelectorAll('p,li').forEach(el=>{
      el.style.fontSize=(pt-0.5)+'pt';
      el.style.marginBottom=(1.5*ratio).toFixed(1)+'px';
    });
    document.querySelectorAll('ul').forEach(el=>{ el.style.margin='1px 0 '+(2*ratio).toFixed(1)+'px'; });
    inner.style.padding=(10*ratio).toFixed(1)+'mm '+(13*ratio).toFixed(1)+'mm';
    updateInfo();
  }

  function updateInfo() {
    const pages = Math.ceil(paper.scrollHeight/A4_PX);
    pageInfo.textContent = '当前约'+pages+'页';
    pageInfo.style.color = pages>2?'#f87171':pages===2?'#facc15':'#4ade80';
  }

  function autoFit(maxP) {
    const maxH = A4_PX*maxP;
    let lo=6,hi=9.5,best=6;
    for(let i=0;i<25;i++){
      const mid=(lo+hi)/2;
      applySize(mid);
      if(paper.scrollHeight<=maxH){best=mid;lo=mid;}
      else hi=mid;
      if(hi-lo<0.05)break;
    }
    applySize(Math.floor(best*10)/10);
  }

  scaleInp.addEventListener('change',()=>applySize(parseFloat(scaleInp.value)||9.5));

  // ── 可编辑模式（始终保持 contenteditable，不存在关闭丢失问题）──
  function toggleEdit() {
    editMode = !editMode;
    const btn = document.getElementById('edit-btn');
    const tip = document.getElementById('edit-tip');
    const fmtBar = document.getElementById('fmt-bar');
    const editZones = [
      document.getElementById('header-text'),
      document.getElementById('resume-body')
    ];
    editZones.forEach(el => {
      if (!el) return;
      // 始终保持 contenteditable=true，只改视觉提示
      el.contentEditable = 'true';
      el.style.outline = 'none';
      if (editMode) {
        el.style.background = 'rgba(59,130,246,0.03)';
        el.style.cursor = 'text';
      } else {
        el.style.background = '';
        el.style.cursor = 'default';
      }
    });
    btn.textContent = editMode ? '✅ 关闭编辑' : '✏️ 开启编辑';
    btn.className   = editMode ? 'btn-blue' : 'btn-orange';
    tip.style.display = editMode ? 'block' : 'none';
    if (fmtBar) fmtBar.style.display = editMode ? 'flex' : 'none';
    if (editMode) {
      const body = document.getElementById('resume-body');
      if (body) body.focus();
    }
  }

  // ── 照片上传 ──
  function triggerPhoto(){photoFile.click()}

  photoFile.addEventListener('change',e=>{
    const file=e.target.files[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      photoImg.src=ev.target.result;
      photoImg.style.display='block';
      document.querySelector('.ph-hint').style.display='none';
      photoDel.style.display='block';
      document.getElementById('photo-area').style.border='none';
      document.getElementById('photo-area').style.background='transparent';
      document.getElementById('photo-tip').style.display='block';
      updateInfo();
    };
    reader.readAsDataURL(file);
  });

  function delPhoto(e){
    e.stopPropagation();
    photoImg.src='';photoImg.style.display='none';
    document.querySelector('.ph-hint').style.display='flex';
    photoDel.style.display='none';
    document.getElementById('photo-area').style.border='1.5px dashed #bbb';
    document.getElementById('photo-area').style.background='#f4f6f9';
  }

  window.onload=()=>{
    applySize(9.5);
    // 始终保持编辑区可编辑，字号修改永久写入 DOM
    ['header-text','resume-body'].forEach(id=>{
      const el=document.getElementById(id);
      if(el){ el.contentEditable='true'; el.style.outline='none'; el.style.cursor='default'; }
    });
  };

  // ── 富文本格式命令 ──
  function execFmt(cmd) {
    document.execCommand(cmd, false, null);
  }
  // ── 字号修改：保存选区 → 输入数字 → 恢复选区 → 应用 ──
  // 用 data-attribute 在输入框上缓存序列化选区位置
  let lastSelRange = null;

  // 选区变化时实时保存（用原生 Selection API）
  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const anchor = sel.anchorNode;
    const body = document.getElementById('resume-body');
    const header = document.getElementById('header-text');
    if (body && (body.contains(anchor) || (header && header.contains(anchor)))) {
      lastSelRange = sel.getRangeAt(0).cloneRange();
    }
  });

  // 输入框获焦：什么都不做，保持 lastSelRange 即可
  function saveSelectionNow() {}
  function clearHighlight() {}

  // 当前选中文字的字号（用于显示）
  let currentFontPt = null;

  // 更新字号显示
  function updateFsizeDisplay(pt) {
    const d = document.getElementById('fsize-display');
    if (d) d.textContent = pt ? pt.toFixed(1) + 'pt' : '—';
  }

  // 从选区检测当前字号
  function detectFontSize() {
    if (!lastSelRange) return null;
    const container = lastSelRange.commonAncestorContainer;
    const el = container.nodeType === 3 ? container.parentElement : container;
    const fs = window.getComputedStyle(el).fontSize;
    return fs ? Math.round(parseFloat(fs) * 0.75 * 10) / 10 : 9.5; // px转pt
  }

  // 加减按钮：全程 mousedown preventDefault，不转移焦点，选区高亮完整保留
  function stepFontSize(e, delta) {
    e.preventDefault(); // 关键：阻止焦点转移，选区高亮不消失
    if (!lastSelRange) return;

    // 初始化当前字号
    if (currentFontPt === null) currentFontPt = detectFontSize() || 9.5;
    currentFontPt = Math.round((currentFontPt + delta) * 10) / 10;
    currentFontPt = Math.max(6, Math.min(72, currentFontPt));
    updateFsizeDisplay(currentFontPt);

    // 恢复选区
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(lastSelRange.cloneRange());

    // 用 span 包裹写入 DOM
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.style.fontSize = currentFontPt + 'pt';
    try {
      range.surroundContents(span);
    } catch(err) {
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
    }

    // 重新选中 span，保持高亮 + 方便继续加减
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(newRange);
    lastSelRange = newRange.cloneRange();
  }

  // selectionchange：选中文字时立即检测并显示当前字号
  document.addEventListener('selectionchange', () => {
    currentFontPt = null;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && lastSelRange) {
      // 延迟一帧确保 lastSelRange 已更新
      requestAnimationFrame(() => {
        const pt = detectFontSize();
        currentFontPt = pt;
        updateFsizeDisplay(pt);
      });
    } else {
      updateFsizeDisplay(null);
    }
  });

  // ── 导出PDF（打印） ──
  function exportPdf() {
    // 关闭编辑视觉提示（内容始终保留）
    if (editMode) toggleEdit();
    setTimeout(() => window.print(), 150);
  }


<\/script>
</body>
</html>`);
    printWindow.document.close();
    setPdfExporting(false);
  };

  const loadFromHistory = (item: HistoryItem) => {
    setResume(item.resume); setJd(item.jd); setResult(item.result);
    setSelectedModel(item.model);
    setOptimizeSuggestions(item.optimizeSuggestions || []);
    setOptimizeRaw("");
    setRewrittenResume(item.rewrittenResume || "");
    setActiveTab("input");
  };

  const scoreColor = result ? (result.score >= 80 ? "#4ade80" : result.score >= 60 ? "#facc15" : "#f87171") : "#60a5fa";
  const suggestionText = result
    ? result.score >= 80 ? "强烈建议投递 🚀" : result.score >= 60 ? "可以尝试投递 ✅" : "建议优化后再投 ⚠️"
    : "";

  const TABS = [
    { id: "input", label: "📝 分析" },
    { id: "optimize", label: "💡 优化建议" + (optimizeSuggestions.length > 0 ? ` (${optimizeSuggestions.length})` : "") },
    { id: "rewrite", label: "✏️ AI改写简历" },
    { id: "history", label: "🕘 历史" + (history.length > 0 ? ` (${history.length})` : "") },
    { id: "prompts", label: "⚙️ Prompt 编辑" },
  ];

  const inputStyle = {
    width: "100%", background: "#0f172a", border: "1px solid #1e293b",
    borderRadius: 12, padding: "16px", color: "#e2e8f0", fontSize: 13,
    lineHeight: 1.7, resize: "vertical" as const, outline: "none",
    boxSizing: "border-box" as const, fontFamily: "inherit"
  };

  const stepBadge = (done: boolean) => ({
    width: 24, height: 24, borderRadius: "50%",
    background: done ? "#14532d" : "#1e293b",
    color: done ? "#4ade80" : "#64748b",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: 700, flexShrink: 0,
  } as React.CSSProperties);

  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#020817", fontFamily: "'Inter', 'PingFang SC', sans-serif", color: "#e2e8f0" }}>

      <div style={{ borderBottom: "1px solid #1e293b", padding: "16px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#020817", position: "sticky", top: 0, zIndex: 100 }}>
        <div
          onClick={() => setShowLanding(true)}
          title="返回首页"
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" as const }}
        >
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>✦</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.3px" }}>JobFit</span>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, color: "#3b82f6", background: "rgba(59,130,246,0.12)", padding: "2px 7px", borderRadius: 4, border: "1px solid rgba(59,130,246,0.25)" }}>AI</span>
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
        <div style={{ margin: "16px 48px", padding: "12px 16px", background: "#450a0a", border: "1px solid #dc262644", borderRadius: 10, color: "#f87171", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
      )}

      <div style={{ padding: "20px 48px 0" }}>
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #1e293b", marginBottom: 24, overflowX: "auto" }}>
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: "10px 18px", border: "none", background: "none", whiteSpace: "nowrap",
              color: activeTab === tab.id ? "#60a5fa" : "#475569",
              fontWeight: activeTab === tab.id ? 700 : 400,
              borderBottom: activeTab === tab.id ? "2px solid #3b82f6" : "2px solid transparent",
              cursor: "pointer", fontSize: 13,
            }}>{tab.label}</button>
          ))}
        </div>

        {/* 分析页 */}
        {activeTab === "input" && (
          <div style={{ paddingBottom: 40 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: "#64748b", letterSpacing: 1, textTransform: "uppercase" }}>👤 我的简历</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {pdfFileName && !pdfStructuring && pdfStructured && (
                      <span style={{ fontSize: 11, color: "#4ade80", background: "#14532d33", padding: "2px 8px", borderRadius: 6, border: "1px solid #16a34a44" }}>
                        ✓ AI结构化完成
                      </span>
                    )}
                    {pdfStructuring && (
                      <span style={{ fontSize: 11, color: "#facc15", display: "flex", alignItems: "center", gap: 4 }}>
                        <Spinner /> AI整理结构中...
                      </span>
                    )}
                    {pdfFileName && !pdfStructuring && !pdfStructured && (
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>✓ {pdfFileName}</span>
                    )}
                    <button onClick={() => fileInputRef.current?.click()} disabled={pdfLoading || pdfStructuring}
                      style={{ background: "#1e3a5f", border: "1px solid #2563eb44", borderRadius: 6, padding: "4px 12px", color: "#60a5fa", fontSize: 11, fontWeight: 600, cursor: (pdfLoading || pdfStructuring) ? "not-allowed" : "pointer", opacity: (pdfLoading || pdfStructuring) ? 0.6 : 1 }}>
                      {pdfLoading ? "解析中..." : pdfStructuring ? "整理中..." : "📂 导入简历"}
                    </button>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp" style={{ display: "none" }}
                  onChange={(e) => { if (e.target.files?.[0]) handlePdfUpload(e.target.files[0]); }} />
                <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.[0]) handlePdfUpload(e.dataTransfer.files[0]); }}
                  style={{ position: "relative" }}>
                  <textarea value={resume} onChange={(e) => { setResume(e.target.value); setPdfFileName(""); setPdfStructured(false); }}
                    placeholder="粘贴简历文字，或点击上方按钮导入简历（支持PDF/图片）..."
                    style={{ ...inputStyle, height: 320, background: dragOver ? "#1e293b" : "#0f172a", border: dragOver ? "2px dashed #3b82f6" : pdfStructured ? "1px solid #16a34a44" : "1px solid #1e293b" }} />
                  {dragOver && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#1e293bcc", borderRadius: 12, pointerEvents: "none" }}>
                      <span style={{ color: "#60a5fa", fontWeight: 700, fontSize: 15 }}>📂 松开鼠标导入简历</span>
                    </div>
                  )}
                  {pdfStructuring && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#020817cc", borderRadius: 12, pointerEvents: "none", gap: 12 }}>
                      <Spinner />
                      <div style={{ fontSize: 13, color: "#facc15", fontWeight: 600 }}>AI 正在识别简历结构...</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>解决PDF乱码问题，请稍候</div>
                    </div>
                  )}
                </div>
                {/* 提示信息 */}
                <div style={{ fontSize: 11, color: "#334155", marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{pdfStructured ? "✨ 已由AI重新整理结构，可直接使用" : "支持直接拖拽PDF到此区域"}</span>
                  {pdfPreviewUrl && pdfStructured && (
                    <button
                      onClick={() => setShowPdfModal(true)}
                      style={{ background: "none", border: "none", color: "#60a5fa", fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>
                      📄 查看原始PDF
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#64748b", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 8 }}>💼 职位描述 JD</label>
                <textarea value={jd} onChange={(e) => setJd(e.target.value)} placeholder="粘贴招聘JD..."
                  style={{ ...inputStyle, height: 320 }} />
              </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ marginBottom: 12, fontSize: 12, color: "#475569" }}>
                当前模型：<span style={{ color: "#60a5fa", fontWeight: 600 }}>{MODELS.find(m => m.id === selectedModel)?.label}</span>
                {"　|　"}{MODELS.find(m => m.id === selectedModel)?.desc}
              </div>
              <button onClick={analyze} disabled={loading} style={{
                background: loading ? "#1e293b" : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                border: "none", borderRadius: 12, padding: "14px 48px", color: "white", fontSize: 15, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 0 30px #3b82f644"
              }}>
                {loading ? <span style={{ display: "flex", alignItems: "center", gap: 10 }}><Spinner />AI 分析中...</span> : "✨ 开始匹配分析"}
              </button>
            </div>

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
                    <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor, marginBottom: 8 }}>{suggestionText}</div>
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
                  <Section title="所需技能" icon="🛠"><div>{result.skills?.map((s, i) => <Tag key={i} text={s} color="blue" />)}</div></Section>
                  <Section title="主要职责" icon="📋"><div>{result.responsibilities?.map((r, i) => <Tag key={i} text={r} color="yellow" />)}</div></Section>
                  <Section title="任职要求" icon="📌"><div>{result.requirements?.map((r, i) => <Tag key={i} text={r} color="blue" />)}</div></Section>
                  <Section title="你的优势亮点" icon="⭐">
                    <ul style={{ margin: 0, padding: "0 0 0 16px" }}>{result.strengths?.map((s, i) => <li key={i} style={{ fontSize: 13, marginBottom: 6, color: "#cbd5e1" }}>{s}</li>)}</ul>
                  </Section>
                  <Section title="待补充的差距" icon="⚡">
                    <ul style={{ margin: 0, padding: "0 0 0 16px" }}>{result.gaps?.map((g, i) => <li key={i} style={{ fontSize: 13, marginBottom: 6, color: "#cbd5e1" }}>{g}</li>)}</ul>
                  </Section>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 优化建议页 */}
        {activeTab === "optimize" && (
          <div style={{ paddingBottom: 40 }}>
            {!result ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#475569" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>💡</div>
                <div>请先完成匹配分析</div>
                <button onClick={() => setActiveTab("input")} style={{ marginTop: 16, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 20px", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>去分析</button>
              </div>
            ) : (
              <div>
                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>💡</span>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>简历优化建议</span>
                    <ScoreBadge score={result.score} />
                    {optimizeSuggestions.length > 0 && <span style={{ fontSize: 12, color: "#64748b" }}>共 {optimizeSuggestions.length} 条</span>}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {optimizeSuggestions.length > 0 && (
                      <button onClick={() => setActiveTab("rewrite")} style={{ background: "#14532d33", border: "1px solid #16a34a44", borderRadius: 8, padding: "8px 14px", color: "#4ade80", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        ✏️ 基于此建议改写 →
                      </button>
                    )}
                    <button onClick={getOptimizeSuggestion} disabled={optimizeLoading} style={{
                      background: optimizeLoading ? "#1e293b" : "linear-gradient(135deg, #3b82f6, #6366f1)",
                      border: "none", borderRadius: 8, padding: "8px 20px", color: "white", fontSize: 13, fontWeight: 600, cursor: optimizeLoading ? "not-allowed" : "pointer"
                    }}>
                      {optimizeLoading ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Spinner />生成中...</span>
                        : optimizeSuggestions.length > 0 ? "重新生成" : "生成优化建议"}
                    </button>
                  </div>
                </div>
                {optimizeSuggestions.length > 0 ? (
                  <div>
                    <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 12, color: "#64748b", alignItems: "center" }}>
                      <span>优先级：</span>
                      {[{ label: "高", color: "#f87171" }, { label: "中", color: "#facc15" }, { label: "低", color: "#60a5fa" }].map(p => (
                        <span key={p.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, display: "inline-block" }} />{p.label}
                        </span>
                      ))}
                      <span style={{ color: "#475569" }}>｜ 修改位置以</span>
                      <span style={{ color: "#f87171", fontWeight: 700 }}>红色</span>
                      <span style={{ color: "#475569" }}>标注</span>
                    </div>
                    {optimizeSuggestions.map((item, i) => <OptimizeCard key={i} item={item} />)}
                  </div>
                ) : optimizeRaw ? (
                  <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.9, whiteSpace: "pre-wrap", background: "#0a0f1e", borderRadius: 10, padding: "16px 20px", border: "1px solid #1e293b" }}>{optimizeRaw}</div>
                ) : (
                  <div style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: "40px 0" }}>点击"生成优化建议"，AI将返回结构化改进建议卡片</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* AI改写简历页 */}
        {activeTab === "rewrite" && (
          <div style={{ paddingBottom: 40 }}>
            {!result ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#475569" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✏️</div>
                <div>请先完成匹配分析</div>
                <button onClick={() => setActiveTab("input")} style={{ marginTop: 16, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 20px", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>去分析</button>
              </div>
            ) : (
              <div>
                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={stepBadge(true)}>✓</span>
                    <span style={{ fontSize: 13, color: "#4ade80" }}>1. 完成匹配分析</span>
                  </div>
                  <span style={{ color: "#334155", fontSize: 16 }}>→</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={stepBadge(optimizeSuggestions.length > 0)}>{optimizeSuggestions.length > 0 ? "✓" : "2"}</span>
                    <span style={{ fontSize: 13, color: optimizeSuggestions.length > 0 ? "#4ade80" : "#64748b" }}>
                      {optimizeSuggestions.length > 0 ? `已生成 ${optimizeSuggestions.length} 条优化建议` : "需生成优化建议"}
                    </span>
                    {optimizeSuggestions.length === 0 && (
                      <button onClick={() => setActiveTab("optimize")} style={{ background: "#1e3a5f", border: "1px solid #2563eb44", borderRadius: 6, padding: "3px 10px", color: "#60a5fa", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>去生成 →</button>
                    )}
                  </div>
                  <span style={{ color: "#334155", fontSize: 16 }}>→</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={stepBadge(!!rewrittenResume)}>3</span>
                    <span style={{ fontSize: 13, color: rewrittenResume ? "#4ade80" : "#64748b" }}>AI改写简历</span>
                  </div>
                </div>

                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: "20px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>✏️</span>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>AI 智能改写简历</span>
                    </div>
                    <button onClick={getRewrittenResume} disabled={rewriteLoading || optimizeSuggestions.length === 0} style={{
                      background: (rewriteLoading || optimizeSuggestions.length === 0) ? "#1e293b" : "linear-gradient(135deg, #059669, #10b981)",
                      border: "none", borderRadius: 8, padding: "8px 20px",
                      color: optimizeSuggestions.length === 0 ? "#475569" : "white",
                      fontSize: 13, fontWeight: 600, cursor: (rewriteLoading || optimizeSuggestions.length === 0) ? "not-allowed" : "pointer"
                    }}>
                      {rewriteLoading ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Spinner />改写中...</span> : rewrittenResume ? "重新改写" : "开始AI改写"}
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: "#475569", marginBottom: 18 }}>
                    {optimizeSuggestions.length > 0
                      ? `将严格基于已生成的 ${optimizeSuggestions.length} 条优化建议改写，保留真实经历`
                      : "⚠ 请先完成第2步「生成优化建议」"}
                  </div>
                  {rewrittenResume ? (
                    <div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div>
                          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>原始简历</div>
                          <textarea readOnly value={resume} style={{ ...inputStyle, height: 480, color: "#64748b", resize: "none" }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: "#4ade80", marginBottom: 8 }}>✨ 基于优化建议改写版本</div>
                          <textarea readOnly value={rewrittenResume} style={{ ...inputStyle, height: 480, border: "1px solid #16a34a44", resize: "none" }} />
                        </div>
                      </div>
                      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" as const }}>
                        <button onClick={() => { setResume(rewrittenResume); setActiveTab("input"); }} style={{ background: "linear-gradient(135deg, #059669, #10b981)", border: "none", borderRadius: 8, padding: "10px 24px", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                          采用此版本并重新分析
                        </button>
                        <button onClick={() => navigator.clipboard.writeText(rewrittenResume)} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "10px 24px", color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>
                          📋 复制优化版本
                        </button>
                        <button
                          onClick={exportToPdf}
                          disabled={pdfExporting}
                          style={{
                            background: pdfExporting ? "#1e293b" : "linear-gradient(135deg, #dc2626, #ef4444)",
                            border: "none", borderRadius: 8, padding: "10px 24px",
                            color: "white", fontSize: 13, fontWeight: 600,
                            cursor: pdfExporting ? "not-allowed" : "pointer",
                            display: "flex", alignItems: "center", gap: 6,
                          }}>
                          {pdfExporting ? <><Spinner />生成中...</> : "📄 导出 PDF"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: "30px 0" }}>
                      {optimizeSuggestions.length > 0 ? "点击「开始AI改写」，将基于优化建议改写" : "请先完成第2步：生成优化建议"}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 历史记录 */}
        {activeTab === "history" && (
          <div style={{ paddingBottom: 40 }}>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#475569" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🕘</div>
                <div>还没有历史记录</div>
                <button onClick={() => setActiveTab("input")} style={{ marginTop: 16, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 20px", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>开始分析</button>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <span style={{ fontSize: 14, color: "#64748b" }}>共 {history.length} 条记录（最多20条）</span>
                  <button onClick={() => setHistory([])} style={{ background: "#450a0a33", border: "1px solid #dc262633", borderRadius: 8, padding: "6px 14px", color: "#f87171", fontSize: 12, cursor: "pointer" }}>清空记录</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {history.map((item) => (
                    <div key={item.id}
                      style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                      onClick={() => loadFromHistory(item)}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#3b82f6"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#1e293b"; }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <ScoreBadge score={item.score} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "#e2e8f0", marginBottom: 3 }}>{item.jobTitle}</div>
                          <div style={{ fontSize: 11, color: "#475569" }}>{item.date}{"　|　"}{MODELS.find(m => m.id === item.model)?.label || item.model}</div>
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

        {/* Prompt 编辑器 */}
        {activeTab === "prompts" && (
          <PromptEditor prompts={prompts} onChange={updatePrompt} />
        )}
      </div>

      {/* PDF 原文预览弹窗 */}
      {showPdfModal && pdfPreviewUrl && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 999,
          background: "#000000cc",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
          onClick={() => setShowPdfModal(false)}
        >
          <div style={{
            width: "80vw", height: "90vh", background: "#0f172a",
            border: "1px solid #1e293b", borderRadius: 16,
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗顶栏 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #1e293b", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>📄</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}>{pdfFileName}</span>
                <span style={{ fontSize: 11, color: "#64748b" }}>原始PDF文件</span>
              </div>
              <button
                onClick={() => setShowPdfModal(false)}
                style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "6px 16px", color: "#94a3b8", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
              >
                ✕ 关闭
              </button>
            </div>
            {/* PDF 渲染 */}
            <iframe
              src={pdfPreviewUrl}
              style={{ flex: 1, border: "none", background: "#fff" }}
              title="PDF预览"
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        html, body { background: #020817; }
        textarea:focus { border-color: #3b82f6 !important; }
        button:hover { opacity: 0.85; }
      `}</style>
    </div>
  );
}
