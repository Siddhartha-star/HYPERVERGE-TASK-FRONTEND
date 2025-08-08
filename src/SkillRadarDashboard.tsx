import jsPDF from "jspdf";
import "jspdf-autotable";
import React, { useEffect, useState } from "react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

// --- Types ---
type Skill = {
  skill: string;
  score: number; // 0-10
  code_snippets: string[];
  timestamps: string[];
  iteration_depth: number;
  ai_flagged?: boolean;
};

// --- Mock API ---
const fetchSkills = async (): Promise<Skill[]> => {
  // Simulate API delay
  await new Promise((res) => setTimeout(res, 400));
  return [
    {
      skill: "Algorithms",
      score: 7.5,
      code_snippets: ["function add(a, b) { return a + b; }"],
      timestamps: ["2025-08-06T13:45Z", "2025-08-06T14:30Z"],
      iteration_depth: 3,
      ai_flagged: true,
    },
    {
      skill: "Data Structures",
      score: 8.2,
      code_snippets: ["class Stack { constructor() { this.items = []; } }"],
      timestamps: ["2025-08-06T11:00Z", "2025-08-06T12:30Z"],
      iteration_depth: 2,
      ai_flagged: false,
    },
    {
      skill: "System Design",
      score: 5.1,
      code_snippets: [],
      timestamps: [],
      iteration_depth: 4,
      ai_flagged: true,
    },
  ];
};

// --- Editable Skill Row ---
type SkillEditRowProps = {
  skill: Skill;
  onChange: (score: number) => void;
  disabled: boolean;
};
const SkillEditRow: React.FC<SkillEditRowProps> = ({ skill, onChange, disabled }) => {
  // Local state for input to allow validation feedback
  const [inputValue, setInputValue] = useState<string>(skill.score.toString());
  const [error, setError] = useState<string>("");

  useEffect(() => {
    setInputValue(skill.score.toString());
  }, [skill.score]);

  // Validate and propagate changes
  const handleInput = (val: string) => {
    setInputValue(val);
    // Only allow numbers and decimals
    if (!/^\d*\.?\d*$/.test(val)) {
      setError("Numbers only");
      return;
    }
    const num = Number(val);
    if (isNaN(num) || num < 0 || num > 10) {
      setError("Value must be 0–10");
      return;
    }
    setError("");
    onChange(num);
  };

  return (
    <div className="flex items-center gap-4 py-2 w-full max-w-md">
      <span className="w-32 truncate" title={skill.skill}>{skill.skill}</span>
      <input
        type="range"
        min={0}
        max={10}
        step={0.1}
        value={skill.score}
        onChange={e => handleInput(e.target.value)}
        className="flex-1 accent-blue-600 focus:ring-2 focus:ring-blue-500"
        aria-label={`Set ${skill.skill} score`}
        disabled={disabled}
      />
      <input
        type="number"
        min={0}
        max={10}
        step={0.1}
        value={inputValue}
        onChange={e => handleInput(e.target.value)}
        className={`w-16 px-1 py-0.5 rounded border ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} bg-transparent text-center focus:ring-2 focus:ring-blue-500`}
        aria-label={`Set ${skill.skill} score (number)`}
        disabled={disabled}
      />
      {error && <span className="text-xs text-red-600 ml-2">{error}</span>}
    </div>
  );
};

// --- Main Component ---
const SkillRadarDashboard: React.FC = () => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [updatingIdx, setUpdatingIdx] = useState<number | null>(null); // For optimistic UI

  // Fetch skills from mock API with error handling
  useEffect(() => {
    setLoading(true);
    setError("");
    (async () => {
      try {
        const data = await fetchSkills();
        setSkills(data);
      } catch (err) {
        setError("Failed to load skills. Please try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Radar chart data
  const radarData = skills.map((item) => ({
    skill: item.skill,
    score: item.score,
  }));

  // Trend chart data (dummy: first = score-1, last = score)
  const trendData = skills.map((item) => ({
    skill: item.skill,
    first: Math.max(0, +(item.score - 1).toFixed(2)),
    last: +item.score.toFixed(2),
  }));

  // PDF Export
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Skill Radar Report", 10, 15);
    doc.setFontSize(12);
    let y = 25;
    radarData.forEach((d) => {
      doc.text(`${d.skill}: ${d.score}/10`, 10, y);
      y += 8;
    });
    y += 5;
    skills.forEach((item, idx) => {
      doc.setFont("helvetica", "bold");
      doc.text(`${item.skill} Details`, 10, y);
      doc.setFont("helvetica", "normal");
      y += 6;
      doc.text(`Attempts: ${item.timestamps && item.timestamps.length > 0 ? item.timestamps.map((t) => new Date(t).toLocaleString()).join(" → ") : "N/A"}`, 12, y);
      y += 6;
      doc.text(`Iteration Depth: ${item.iteration_depth ?? "N/A"}`, 12, y);
      y += 6;
      if (item.ai_flagged) {
        doc.setTextColor(255, 0, 0);
        doc.text("AI/Plagiarism Suspected", 12, y, { maxWidth: 180 });
        doc.setTextColor(0, 0, 0);
        y += 6;
      }
      doc.text("Code Snippets:", 12, y);
      y += 6;
      if (item.code_snippets && item.code_snippets.length > 0) {
        item.code_snippets.forEach((code) => {
          const lines = doc.splitTextToSize(code, 180);
          lines.forEach((line: string) => {
            doc.text(line, 14, y);
            y += 5;
          });
        });
      } else {
        doc.text("N/A", 14, y);
        y += 6;
      }
      y += 2;
      if (y > 270 && idx < skills.length - 1) {
        doc.addPage();
        y = 15;
      }
    });
    doc.save("skill_report.pdf");
  };

  // Skill update handler with optimistic UI
  const handleSkillScoreChange = (idx: number, newScore: number) => {
    // Clamp and validate
    if (isNaN(newScore) || newScore < 0 || newScore > 10) return;
    setUpdatingIdx(idx);
    setSkills((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], score: Math.max(0, Math.min(10, newScore)) };
      return updated;
    });
    // Simulate async update
    setTimeout(() => setUpdatingIdx(null), 400);
  };

  // Accessibility: keyboard handler for skill buttons
  const handleSkillButtonKeyDown = (e: React.KeyboardEvent, skill: string) => {
    if (e.key === "Enter" || e.key === " ") {
      setSelectedSkill(skills.find((s) => s.skill === skill) || null);
    }
  };

  return (
    <div className="p-6 text-gray-800 dark:text-white min-h-screen bg-background transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Skill Radar Dashboard</h1>
        <button
          onClick={() => setDarkMode((d) => !d)}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          className="ml-4 px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {darkMode ? "🌙 Dark" : "☀️ Light"}
        </button>
      </div>

      {/* Loading and error states */}
      {loading ? (
        <div className="text-center py-12 text-gray-500" role="status" aria-live="polite">Loading skills…</div>
      ) : error ? (
        <div className="text-center py-12 text-red-600" role="alert">{error}</div>
      ) : skills.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No skills found.</div>
      ) : (
        <>
          {/* Editable Skill Inputs */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-2">Edit Your Skills</h2>
            <div className="flex flex-col gap-2">
              {skills.map((skill, idx) => (
                <SkillEditRow
                  key={skill.skill}
                  skill={skill}
                  onChange={(val) => handleSkillScoreChange(idx, val)}
                  disabled={loading || updatingIdx === idx}
                />
              ))}
            </div>
          </div>

          {/* Radar Chart */}
          <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
            <div>
              <RadarChart cx={200} cy={200} outerRadius={120} width={400} height={400} data={radarData} aria-label="Skill Radar Chart">
                <PolarGrid />
                <PolarAngleAxis dataKey="skill" />
                <PolarRadiusAxis angle={30} domain={[0, 10]} />
                <Radar
                  name="You"
                  dataKey="score"
                  stroke="#2563eb"
                  fill="#2563eb"
                  fillOpacity={0.5}
                  isAnimationActive={false}
                  aria-label="Skill scores radar"
                />
              </RadarChart>
              <div className="flex flex-wrap gap-2 mt-4 justify-center" aria-label="Skill list for details">
                {skills.map((d) => (
                  <button
                    key={d.skill}
                    className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    tabIndex={0}
                    aria-label={`Show details for ${d.skill}`}
                    onClick={() => setSelectedSkill(d)}
                    onKeyDown={(e) => handleSkillButtonKeyDown(e, d.skill)}
                  >
                    {d.skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Trend Chart */}
            <div>
              <h2 className="text-lg font-semibold mb-2 text-center">Trend Comparison</h2>
              <LineChart width={400} height={300} data={trendData} aria-label="Skill Trend Chart">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="skill" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="first" stroke="#82ca9d" name="Previous" />
                <Line type="monotone" dataKey="last" stroke="#2563eb" name="Current" />
              </LineChart>
            </div>
          </div>
        </>
      )}

      {/* Skill Detail Modal */}
      {selectedSkill && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="skill-detail-title"
          tabIndex={-1}
        >
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-lg relative">
            <button
              className="absolute top-2 right-2 px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              onClick={() => setSelectedSkill(null)}
              aria-label="Close skill details"
            >
              ×
            </button>
            <h2 id="skill-detail-title" className="text-xl font-semibold mb-2">{selectedSkill.skill} Details</h2>
            {selectedSkill.ai_flagged && (
              <span
                className="inline-block bg-red-600 text-white px-2 py-1 rounded text-xs font-bold mr-2 mb-2"
                aria-label="AI or plagiarism suspected"
              >
                AI/Plagiarism Suspected
              </span>
            )}
            <p><strong>Score:</strong> {selectedSkill.score}/10</p>
            <p><strong>Attempts:</strong> {selectedSkill.timestamps && selectedSkill.timestamps.length > 0 ? selectedSkill.timestamps.map((t) => new Date(t).toLocaleString()).join(" → ") : "N/A"}</p>
            <p><strong>Iteration Depth:</strong> {selectedSkill.iteration_depth ?? "N/A"}</p>
            <h3 className="mt-2 mb-1 font-semibold">Code Snippets:</h3>
            {selectedSkill.code_snippets && selectedSkill.code_snippets.length > 0 ? (
              selectedSkill.code_snippets.map((code: string, idx: number) => (
                <SyntaxHighlighter language="javascript" key={idx}>
                  {code}
                </SyntaxHighlighter>
              ))
            ) : (
              <div className="text-gray-400">N/A</div>
            )}
          </div>
        </div>
      )}

      {/* PDF Export Button */}
      <button
        onClick={exportPDF}
        className="mt-8 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        aria-label="Export skill report as PDF"
      >
        Export PDF
      </button>
    </div>
  );
};

export default SkillRadarDashboard;
