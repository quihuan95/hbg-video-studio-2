import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Check,
  CheckCircle2,
  ChevronRight,
  Clapperboard,
  Clock3,
  Download,
  Film,
  FolderOpen,
  LayoutDashboard,
  LoaderCircle,
  MonitorPlay,
  MoreHorizontal,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Subtitles,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import {
  createProject,
  timeline,
  voiceSignature,
  type Project,
  type Asset,
  type StudioApi,
  type SettingsStatus,
  type Progress,
} from "../shared/types";
import "./styles.css";
import { FootageAnalyzer } from "./FootageAnalyzer";
declare global {
  interface Window {
    studio?: StudioApi;
  }
}
const api = window.studio;
const media = (p?: string) =>
  p ? `hbg-media://local/${encodeURIComponent(p)}` : undefined;
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
const basename = (p?: string) => p?.split(/[\\/]/).pop();
const tabs = ["Thiết lập", "Footage", "Kịch bản", "Timeline", "Xuất video"];

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project>(createProject);
  const [tab, setTab] = useState(0);
  const [view, setView] = useState<"editor" | "projects" | "style">("editor");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [status, setStatus] = useState<SettingsStatus>();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress>();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<string>();
  const [musicPreview, setMusicPreview] = useState<string>();
  useEffect(() => {
    if (!api || busy || (!project.title.trim() && !project.assets.length))
      return;
    const timer = setTimeout(() => {
      api
        .save(project)
        .then(() =>
          setProjects((prev) => [
            project,
            ...prev.filter((p) => p.id !== project.id),
          ]),
        )
        .catch((e) => setError(`Không thể tự lưu dự án: ${e.message}`));
    }, 750);
    return () => clearTimeout(timer);
  }, [project, busy]);
  useEffect(() => {
    if (!api) return;
    api
      .load()
      .then((p) => {
        setProjects(p);
        if (p[0]) setProject(p[0]);
      })
      .catch((e) => setError(e.message));
    api
      .settings()
      .then(setStatus)
      .catch((e) => setError(e.message));
    return api.onProgress(setProgress);
  }, []);
  function update(patch: Partial<Project>) {
    setProject((p) => {
      const next = {
        ...p,
        ...patch,
        output: undefined,
        updatedAt: new Date().toISOString(),
      };
      if (
        patch.beats &&
        p.captionCues &&
        patch.beats.length === p.beats.length &&
        voiceSignature(next) === voiceSignature(p)
      )
        next.captionCues = p.captionCues.map((c, i) => ({
          ...c,
          text: patch.beats![i].caption,
        }));
      return next;
    });
  }
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    setProgress(undefined);
    try {
      if (!api)
        throw new Error(
          "Hãy mở ứng dụng bằng npm run dev để sử dụng chức năng desktop.",
        );
      await fn();
    } catch (e) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setError(
        (e as Error).message.replace(
          /^Error invoking remote method '[^']+': Error: /,
          "",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function save(p = project) {
    await api!.save(p);
    setProjects((prev) => [p, ...prev.filter((x) => x.id !== p.id)]);
    setNotice("Đã lưu dự án trên máy.");
  }
  async function step(action: "analyze" | "script" | "voice" | "render") {
    await run(async () => {
      const p = await api![action](project);
      setProject(p);
      setProjects((prev) => [p, ...prev.filter((x) => x.id !== p.id)]);
      if (action === "script") setTab(2);
      if (action === "render") setTab(4);
      setNotice(p.outputNotice || "Hoàn tất. Dự án đã được lưu.");
    });
  }
  async function generate() {
    await run(async () => {
      let p = project;
      if (!p.assets.some((a) => !a.error))
        throw new Error("Hãy nhập thư mục footage trước.");
      if (!p.title.trim()) throw new Error("Hãy nhập tiêu đề video.");
      if (
        !status?.openaiConfigured ||
        !status.elevenConfigured ||
        !status.voiceId
      ) {
        setSettingsOpen(true);
        throw new Error(
          "Cần cấu hình OpenAI, ElevenLabs và Voice ID trước khi tạo video.",
        );
      }
      p = await api!.analyze(p);
      setProject(p);
      p = await api!.script(p);
      setProject(p);
      p = await api!.voice(p);
      setProject(p);
      p = await api!.render(p);
      setProject(p);
      await save(p);
      setTab(4);
    });
  }
  const validAssets = project.assets.filter((a) => !a.error);
  const selected =
    validAssets.find((a) => a.id === selectedAsset) ||
    validAssets.find((a) => a.id === project.beats[0]?.assetId) ||
    validAssets[0];
  const hasVoice =
    project.voicePath && project.voiceSignature === voiceSignature(project);
  const duration = project.beats.reduce((n, b) => n + b.durationMs, 0);
  const readiness = [
    !!project.title.trim(),
    !!validAssets.length,
    validAssets.some((a) => a.description),
    !!project.beats.length,
    !!hasVoice,
    !!project.output,
  ];
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            H<span>.</span>
          </span>
          <div>
            THE HBG<span>SHORTS STUDIO</span>
          </div>
        </div>
        <div className="workspace-label">
          WORKSPACE <span>V0.1</span>
        </div>
        <nav>
          <button
            className={view === "projects" ? "active" : ""}
            onClick={() => setView("projects")}
          >
            <LayoutDashboard size={19} />
            Dự án của tôi<span className="nav-count">{projects.length}</span>
          </button>
          <button
            className={view === "editor" ? "active" : ""}
            onClick={() => setView("editor")}
          >
            <Clapperboard size={19} />
            Không gian dựng
          </button>
          <button
            className={view === "style" ? "active" : ""}
            onClick={() => setView("style")}
          >
            <WandSparkles size={19} />
            Phong cách thương hiệu
          </button>
        </nav>
        <div className="sidebar-projects">
          <div className="workspace-label">
            GẦN ĐÂY
            <button
              aria-label="Tạo dự án"
              disabled={busy}
              onClick={() => {
                setProject(createProject());
                setView("editor");
                setTab(0);
              }}
            >
              <Plus size={16} />
            </button>
          </div>
          {projects.slice(0, 4).map((p) => (
            <button
              key={p.id}
              disabled={busy}
              onClick={() => {
                setProject(p);
                setView("editor");
                setTab(0);
              }}
            >
              <span className="project-dot" />
              {p.title || "Dự án chưa đặt tên"}
            </button>
          ))}
          {!projects.length && <p>Dự án đã lưu sẽ xuất hiện ở đây.</p>}
        </div>
        <div className="sidebar-bottom">
          <div className="local-badge">
            <ShieldCheck size={18} />
            <div>
              Không gian riêng của bạn
              <small>Footage gốc được giữ trên máy</small>
            </div>
          </div>
          <button onClick={() => setSettingsOpen(true)}>
            <Settings2 size={18} />
            Cài đặt ứng dụng
          </button>
          <div className="user">
            <div className="avatar">H</div>
            <div>
              The HBG Official<small>Creative workspace</small>
            </div>
            <span className="online" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header>
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <span>
              {view === "projects"
                ? "Dự án của tôi"
                : view === "style"
                  ? "Phong cách thương hiệu"
                  : "Video mới"}
            </span>
          </div>
          <div className="header-right">
            <span className="desktop-pill">
              <span /> Desktop workspace
            </span>
            <button
              className="icon-button"
              aria-label="Cài đặt"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 size={19} />
            </button>
          </div>
        </header>
        <main>
          {view === "projects" ? (
            <>
              <div className="page-heading">
                <div className="eyebrow">YOUR CREATIVE LIBRARY</div>
                <h1>
                  Dự án của tôi<span>.</span>
                </h1>
                <p>Mỗi câu chuyện bắt đầu từ một ý tưởng.</p>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => {
                    setProject(createProject());
                    setView("editor");
                    setTab(0);
                  }}
                >
                  <Plus size={17} />
                  Dự án mới
                </button>
              </div>
              <div className="project-grid">
                {projects.map((p) => (
                  <button
                    className="project-card"
                    key={p.id}
                    disabled={busy}
                    onClick={() => {
                      setProject(p);
                      setView("editor");
                      setTab(0);
                    }}
                  >
                    <div className="project-cover">
                      {p.assets[0]?.thumbnail ? (
                        <img src={media(p.assets[0].thumbnail)} />
                      ) : (
                        <Film size={40} />
                      )}
                      <span>
                        {p.ratio} · {p.duration}s
                      </span>
                    </div>
                    <h3>{p.title || "Chưa đặt tên"}</h3>
                    <p>
                      {p.category === "event"
                        ? "Thương hiệu & Sự kiện"
                        : "Tour & Điểm đến"}{" "}
                      · {p.assets.length} tài nguyên
                    </p>
                  </button>
                ))}
                {!projects.length && (
                  <div className="empty-state">
                    <FolderOpen size={40} />
                    <h3>Chưa có dự án nào</h3>
                    <p>Tạo dự án đầu tiên và lưu để tiếp tục bất cứ lúc nào.</p>
                  </div>
                )}
              </div>
            </>
          ) : view === "style" ? (
            <>
              <div className="eyebrow">BRAND PLAYBOOK</div>
              <h1>
                Chất riêng của The HBG<span>.</span>
              </h1>
              <p className="muted">
                Preset được xây dựng từ tài liệu phong cách của bạn. Chưa phân
                tích clip mẫu.
              </p>
              <div className="style-grid">
                {[
                  [
                    "01",
                    "Mở đầu có điểm nhấn",
                    "Hình mạnh ngay khung đầu. Voice vào sớm, hook rõ chủ đề trong 3 giây.",
                  ],
                  [
                    "02",
                    "Hình ảnh chứng minh lời nói",
                    "Mỗi câu một ý, mỗi ý có footage phù hợp. Không suy đoán tên, giá hoặc thông tin sự kiện.",
                  ],
                  [
                    "03",
                    "Nhịp dựng tự nhiên",
                    "Shot 2–4 giây là điểm xuất phát. Cắt theo cụm nghĩa, xen toàn, trung và cận.",
                  ],
                  [
                    "04",
                    "Hai hướng nội dung",
                    "Sự kiện: voice Việt, phụ đề Anh. Tour: voice và phụ đề Việt, hotline đã duyệt.",
                  ],
                  [
                    "05",
                    "Nhận diện nhất quán",
                    "Xanh đậm, vàng, thẻ từ khóa Việt và phụ đề trắng. Logo dùng từ asset thương hiệu thật.",
                  ],
                  [
                    "06",
                    "Một lời kêu gọi",
                    "Kết bằng một hành động duy nhất. Mặc định theo dõi The HBG Official cho video sự kiện.",
                  ],
                ].map(([n, title, body]) => (
                  <section className="card style-card" key={n}>
                    <span>{n}</span>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </section>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span /> FROM FOOTAGE TO STORY
                  </div>
                  <h1>
                    Tạo câu chuyện tiếp theo<span>.</span>
                  </h1>
                  <p>
                    Tư liệu của bạn. Phong cách HBG. Một quy trình liền mạch.
                  </p>
                </div>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => run(() => save())}
                >
                  <Save size={16} />
                  Lưu dự án
                </button>
              </div>
              <div className="workflow">
                {tabs.map((label, i) => (
                  <React.Fragment key={label}>
                    <button
                      className={tab === i ? "current" : ""}
                      onClick={() => setTab(i)}
                    >
                      <span className={i < tab ? "complete" : ""}>
                        {i < tab ? (
                          <Check size={14} />
                        ) : (
                          String(i + 1).padStart(2, "0")
                        )}
                      </span>
                      {label}
                    </button>
                    {i < 4 && <div className="step-line" />}
                  </React.Fragment>
                ))}
              </div>
              {error && (
                <div role="alert" className="alert error">
                  <span>{error}</span>
                  <button
                    aria-label="Đóng thông báo"
                    onClick={() => setError("")}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              {notice && (
                <div role="status" className="alert success">
                  <CheckCircle2 size={17} />
                  {notice}
                  <button
                    aria-label="Đóng thông báo"
                    onClick={() => setNotice("")}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              {busy && (
                <div className="progress-card">
                  <LoaderCircle size={18} className="spin" />
                  <div>
                    <b>{progress?.message || "Đang chuẩn bị…"}</b>
                    <div className="progress-track">
                      <span style={{ width: `${progress?.percent || 2}%` }} />
                    </div>
                  </div>
                  <button className="text-button" onClick={() => api?.cancel()}>
                    Hủy tác vụ
                  </button>
                </div>
              )}
              <div className="editor-grid">
                <div className="editor-content">
                  <fieldset disabled={busy}>
                    {tab === 0 && (
                      <>
                        <section className="card">
                          <div className="section-heading">
                            <div className="section-icon">
                              <Clapperboard size={20} />
                            </div>
                            <div>
                              <h2>Bắt đầu với ý tưởng</h2>
                              <p>Bạn muốn kể câu chuyện gì hôm nay?</p>
                            </div>
                            <span className="required-note">* Bắt buộc</span>
                          </div>
                          <label>
                            Tiêu đề video <em>*</em>
                            <input
                              value={project.title}
                              maxLength={200}
                              onChange={(e) =>
                                update({ title: e.target.value })
                              }
                              placeholder="VD: Phía sau một sự kiện thành công của The HBG"
                            />
                          </label>
                          <label>Loại nội dung</label>
                          <div className="category-options">
                            <button
                              className={
                                project.category === "event"
                                  ? "choice selected"
                                  : "choice"
                              }
                              onClick={() =>
                                update({
                                  category: "event",
                                  cta: "Theo dõi The HBG Official",
                                })
                              }
                            >
                              <span className="radio" />
                              <div>
                                <strong>Thương hiệu & Sự kiện</strong>
                                <small>
                                  Hội nghị, hậu trường, câu chuyện thương hiệu
                                </small>
                              </div>
                              <Clapperboard size={23} />
                            </button>
                            <button
                              className={
                                project.category === "tour"
                                  ? "choice selected"
                                  : "choice"
                              }
                              onClick={() =>
                                update({
                                  category: "tour",
                                  cta: "Liên hệ để được tư vấn",
                                })
                              }
                            >
                              <span className="radio" />
                              <div>
                                <strong>Tour & Điểm đến</strong>
                                <small>
                                  Trải nghiệm, hành trình, nội dung theo mùa
                                </small>
                              </div>
                              <MonitorPlay size={23} />
                            </button>
                          </div>
                          <div className="two-cols">
                            <label>
                              Mục tiêu video
                              <textarea
                                rows={2}
                                value={project.objective}
                                onChange={(e) =>
                                  update({ objective: e.target.value })
                                }
                                placeholder="Điều bạn muốn người xem ghi nhớ…"
                              />
                            </label>
                            <label>
                              Đối tượng người xem
                              <textarea
                                rows={2}
                                value={project.audience}
                                onChange={(e) =>
                                  update({ audience: e.target.value })
                                }
                                placeholder="Khách hàng doanh nghiệp, người yêu du lịch…"
                              />
                            </label>
                          </div>
                        </section>
                        <section className="card">
                          <div className="section-heading">
                            <div className="section-icon">
                              <Film size={20} />
                            </div>
                            <div>
                              <h2>Tư liệu của dự án</h2>
                              <p>
                                Những thước phim làm nên câu chuyện của bạn.
                              </p>
                            </div>
                          </div>
                          <button
                            className="upload-zone"
                            onClick={() =>
                              run(async () => {
                                const a = await api!.importFootage();
                                if (a.length)
                                  update({
                                    assets: [
                                      ...project.assets,
                                      ...a.filter(
                                        (x) =>
                                          !project.assets.some(
                                            (y) => y.path === x.path,
                                          ),
                                      ),
                                    ],
                                  });
                              })
                            }
                          >
                            <span className="upload-icon">
                              <Upload size={24} />
                            </span>
                            <strong>
                              {project.assets.length
                                ? `Đã nhập ${project.assets.length} tài nguyên`
                                : "Chọn thư mục footage"}
                            </strong>
                            <span>
                              Quét cả thư mục con · MP4, MOV, WebM, JPG, PNG
                            </span>
                            <span className="upload-cta">
                              <FolderOpen size={15} />
                              Duyệt thư mục
                            </span>
                          </button>
                          <div className="asset-pickers">
                            <button
                              onClick={() =>
                                run(async () => {
                                  const logo = await api!.selectFile("logo");
                                  if (logo) update({ logo });
                                })
                              }
                            >
                              <div className="mini-icon">H.</div>
                              <div>
                                <b>
                                  {basename(project.logo) || "Logo thương hiệu"}
                                </b>
                                <small>PNG trong suốt · Tùy chọn</small>
                              </div>
                              <Plus size={17} />
                            </button>
                            <button
                              onClick={() =>
                                run(async () => {
                                  const outro = await api!.selectFile("outro");
                                  if (outro)
                                    update({
                                      outro,
                                      outroDurationMs:
                                        await api!.outroInfo(outro),
                                    });
                                })
                              }
                            >
                              <div className="mini-icon">
                                <Film size={18} />
                              </div>
                              <div>
                                <b>
                                  {basename(project.outro) ||
                                    "Outro thương hiệu"}
                                </b>
                                <small>
                                  {project.outroDurationMs
                                    ? `${seconds(project.outroDurationMs)} · Ghép cuối video`
                                    : "Tự động ghép cuối video"}
                                </small>
                              </div>
                              <Plus size={17} />
                            </button>
                          </div>
                          {project.outro && (
                            <button
                              className="text-button"
                              onClick={() =>
                                update({
                                  outro: undefined,
                                  outroDurationMs: undefined,
                                })
                              }
                            >
                              Bỏ chọn outro
                            </button>
                          )}
                        </section>
                        <section className="card">
                          <div className="section-heading">
                            <div className="section-icon">
                              <Settings2 size={20} />
                            </div>
                            <div>
                              <h2>Thiết lập video</h2>
                              <p>
                                Định dạng phù hợp với nơi câu chuyện được chia
                                sẻ.
                              </p>
                            </div>
                          </div>
                          <div className="two-cols">
                            <label>
                              Thời lượng mục tiêu
                              <div className="input-unit">
                                <input
                                  type="number"
                                  min={5}
                                  max={600}
                                  value={project.duration}
                                  onChange={(e) => {
                                    const n = Number(e.target.value);
                                    if (n >= 5 && n <= 600)
                                      update({ duration: n });
                                  }}
                                />
                                <span>giây</span>
                              </div>
                              <small className="field-hint">
                                Preset HBG khuyến nghị 50–55 giây
                              </small>
                            </label>
                            <div>
                              <label>Tỉ lệ khung hình</label>
                              <div className="ratios">
                                {(["9:16", "1:1", "16:9"] as const).map((r) => (
                                  <button
                                    className={
                                      project.ratio === r ? "selected" : ""
                                    }
                                    key={r}
                                    onClick={() => update({ ratio: r })}
                                  >
                                    <span
                                      style={{
                                        width: r === "9:16" ? 12 : 20,
                                        height: r === "16:9" ? 12 : 20,
                                      }}
                                    />
                                    {r}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="two-cols">
                            <label>
                              Lời kêu gọi hành động
                              <input
                                value={project.cta}
                                onChange={(e) =>
                                  update({ cta: e.target.value })
                                }
                              />
                            </label>
                            <label>
                              Hotline đã duyệt
                              <input
                                value={project.hotline}
                                onChange={(e) =>
                                  update({ hotline: e.target.value })
                                }
                                placeholder="Tùy chọn · Không tự suy đoán"
                              />
                            </label>
                          </div>
                        </section>
                      </>
                    )}
                    {tab === 0 && (
                      <section className="card">
                        <div className="section-heading">
                          <div className="section-icon">
                            <AudioLines size={20} />
                          </div>
                          <div>
                            <h2>Nhạc nền & giọng đọc</h2>
                            <p>
                              Voice tự cân theo thời lượng nội dung; nhạc outro
                              phát riêng.
                            </p>
                          </div>
                        </div>
                        <label
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "center",
                          }}
                        >
                          <input
                            type="checkbox"
                            style={{ width: "auto", margin: 0 }}
                            checked={project.musicEnabled !== false}
                            onChange={(e) =>
                              update({ musicEnabled: e.target.checked })
                            }
                          />
                          Bật nhạc nền cho phần nội dung
                        </label>
                        {project.musicEnabled !== false && (
                          <>
                            <div className="export-spec">
                              <AudioLines size={25} />
                              <div>
                                <h3>
                                  {basename(project.musicPath) ||
                                    "HBG Instrumental · Nhạc có sẵn"}
                                </h3>
                                <p>
                                  Nhạc không lời · tự lặp · hạ dưới voice · dừng
                                  trước outro
                                </p>
                              </div>
                            </div>
                            <div className="export-actions">
                              <button
                                className="secondary"
                                onClick={() =>
                                  run(async () => {
                                    const musicPath =
                                      await api!.selectFile("music");
                                    if (musicPath) {
                                      update({ musicPath });
                                      setMusicPreview(musicPath);
                                    }
                                  })
                                }
                              >
                                <FolderOpen size={16} />
                                Chọn nhạc riêng
                              </button>
                              <button
                                className="secondary"
                                onClick={() =>
                                  run(async () => {
                                    update({ musicPath: undefined });
                                    setMusicPreview(await api!.defaultMusic());
                                  })
                                }
                              >
                                Dùng nhạc có sẵn
                              </button>
                              <button
                                className="text-button"
                                onClick={() =>
                                  run(async () => {
                                    setMusicPreview(
                                      project.musicPath ||
                                        (await api!.defaultMusic()),
                                    );
                                  })
                                }
                              >
                                Nghe thử
                              </button>
                            </div>
                            <label>
                              Âm lượng nhạc nền:{" "}
                              {Math.round((project.musicVolume ?? 0.18) * 100)}%
                              <input
                                type="range"
                                min={0}
                                max={50}
                                step={1}
                                value={Math.round(
                                  (project.musicVolume ?? 0.18) * 100,
                                )}
                                onChange={(e) =>
                                  update({
                                    musicVolume: Number(e.target.value) / 100,
                                  })
                                }
                              />
                            </label>
                            {musicPreview && (
                              <audio
                                key={musicPreview}
                                controls
                                src={media(musicPreview)}
                                style={{ width: "100%" }}
                              />
                            )}
                          </>
                        )}
                        <div className="info-note">
                          Ứng dụng dành thời gian cho outro trước khi viết lời.
                          Nếu lời lệch nhiều, AI tự biên tập lại tối đa 2 lần;
                          nếu lệch ít, chỉnh nhẹ nhịp đọc và căn lại phụ đề.
                          Nhạc outro giữ nguyên âm lượng gốc.
                        </div>
                      </section>
                    )}
                    {tab === 1 && (
                      <section className="card">
                        <FootageAnalyzer api={api} project={project} busy={busy} />
                        <div className="section-heading">
                          <div className="section-icon">
                            <FolderOpen size={20} />
                          </div>
                          <div>
                            <h2>Thư viện footage</h2>
                            <p>
                              {validAssets.length} hợp lệ ·{" "}
                              {project.assets.length - validAssets.length} file
                              lỗi · Phân tích theo shot
                            </p>
                          </div>
                          <button
                            className="secondary"
                            onClick={() => step("analyze")}
                          >
                            <Sparkles size={16} />
                            Phân tích AI
                          </button>
                        </div>
                        <div className="info-note">
                          Phân tích từng shot bằng FFmpeg, PySceneDetect và OpenAI. Kết quả lưu SQLite, dùng chung giữa các dự án.
                        </div>
                        {!project.assets.length ? (
                          <div className="empty-state">
                            <FolderOpen size={38} />
                            <h3>Thêm những thước phim đầu tiên</h3>
                            <button
                              className="secondary"
                              onClick={() => setTab(0)}
                            >
                              Về thiết lập dự án
                            </button>
                          </div>
                        ) : (
                          <div className="asset-grid">
                            {project.assets.map((a) => (
                              <div
                                className={`asset-card ${a.error ? "invalid" : ""}`}
                                key={a.id}
                              >
                                <button
                                  className="asset-thumb"
                                  onClick={() => setSelectedAsset(a.id)}
                                >
                                  {a.thumbnail ? (
                                    <img src={media(a.thumbnail)} />
                                  ) : (
                                    <Film size={28} />
                                  )}
                                  <span>
                                    {a.error
                                      ? "Lỗi"
                                      : a.kind === "image"
                                        ? "Ảnh tĩnh"
                                        : seconds(a.durationMs)}
                                  </span>
                                </button>
                                <h3 title={a.name}>{a.name}</h3>
                                <p>{a.error || `${a.width} × ${a.height}`}</p>
                                <p className="asset-description">
                                  {a.description ||
                                    (!a.error ? "Chưa phân tích nội dung" : "")}
                                </p>
                                <button
                                  className="text-button"
                                  onClick={() => {
                                    update({
                                      assets: project.assets.filter(
                                        (x) => x.id !== a.id,
                                      ),
                                    });
                                  }}
                                >
                                  Gỡ khỏi dự án
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    )}
                    {tab === 2 && (
                      <section className="card">
                        <div className="section-heading">
                          <div className="section-icon">
                            <Subtitles size={20} />
                          </div>
                          <div>
                            <h2>Kịch bản & lời đọc</h2>
                            <p>
                              Voice Việt · Phụ đề{" "}
                              {project.category === "event" ? "Anh" : "Việt"} ·
                              Thẻ từ khóa Việt
                            </p>
                          </div>
                          <button
                            className="secondary"
                            onClick={() => {
                              const asset = validAssets[0];
                              if (!asset) {
                                setError(
                                  "Hãy nhập footage trước khi thêm cảnh.",
                                );
                                return;
                              }
                              update({
                                beats: [
                                  ...project.beats,
                                  {
                                    id: crypto.randomUUID(),
                                    voice: "",
                                    caption: "",
                                    overlay: "",
                                    assetId: asset.id,
                                    durationMs: Math.min(
                                      3000,
                                      asset.durationMs,
                                    ),
                                    sourceInMs: 0,
                                  },
                                ],
                              });
                            }}
                          >
                            <Plus size={16} />
                            Thêm cảnh
                          </button>
                          <button
                            className="secondary"
                            onClick={() => step("script")}
                          >
                            <WandSparkles size={16} />
                            Viết kịch bản
                          </button>
                        </div>
                        {!project.beats.length ? (
                          <div className="empty-state">
                            <Subtitles size={38} />
                            <h3>Câu chuyện đang chờ được viết</h3>
                            <p>
                              Phân tích footage rồi dùng AI viết kịch bản có
                              hình chứng minh.
                            </p>
                          </div>
                        ) : (
                          project.beats.map((b, i) => (
                            <div className="beat-editor" key={b.id}>
                              <div className="beat-title">
                                <span>
                                  BEAT {String(i + 1).padStart(2, "0")}
                                </span>
                                <button
                                  aria-label="Xóa cảnh"
                                  onClick={() =>
                                    update({
                                      beats: project.beats.filter(
                                        (x) => x.id !== b.id,
                                      ),
                                      captionCues: undefined,
                                    })
                                  }
                                >
                                  <X size={14} />
                                </button>
                                <small>
                                  {seconds(b.durationMs)} ·{" "}
                                  {hasVoice ? "Đã căn voice" : "Timing tạm"}
                                </small>
                              </div>
                              <label>
                                Lời ElevenLabs
                                <textarea
                                  rows={2}
                                  value={b.voice}
                                  onChange={(e) =>
                                    update({
                                      beats: project.beats.map((x) =>
                                        x.id === b.id
                                          ? { ...x, voice: e.target.value }
                                          : x,
                                      ),
                                    })
                                  }
                                />
                              </label>
                              <div className="two-cols">
                                <label>
                                  Phụ đề
                                  <textarea
                                    rows={2}
                                    value={b.caption}
                                    onChange={(e) =>
                                      update({
                                        captionCues: undefined,
                                        beats: project.beats.map((x) =>
                                          x.id === b.id
                                            ? { ...x, caption: e.target.value }
                                            : x,
                                        ),
                                      })
                                    }
                                  />
                                </label>
                                <label>
                                  Thẻ từ khóa
                                  <textarea
                                    rows={2}
                                    value={b.overlay}
                                    onChange={(e) =>
                                      update({
                                        beats: project.beats.map((x) =>
                                          x.id === b.id
                                            ? { ...x, overlay: e.target.value }
                                            : x,
                                        ),
                                      })
                                    }
                                  />
                                </label>
                              </div>
                              <label>
                                Cảnh minh họa
                                <select
                                  value={b.assetId}
                                  onChange={(e) =>
                                    update({
                                      beats: project.beats.map((x) =>
                                        x.id === b.id
                                          ? {
                                              ...x,
                                              assetId: e.target.value,
                                              sourceInMs: 0,
                                            }
                                          : x,
                                      ),
                                    })
                                  }
                                >
                                  {validAssets.map((a) => (
                                    <option key={a.id} value={a.id}>
                                      {a.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                          ))
                        )}
                        {project.beats.length > 0 && (
                          <button
                            className="primary"
                            onClick={() => step("voice")}
                          >
                            <AudioLines size={17} />
                            Tạo voice ElevenLabs
                          </button>
                        )}
                        {hasVoice && (
                          <div
                            className="info-note"
                            style={{ flexDirection: "column" }}
                          >
                            <strong>
                              Voice đã tạo ·{" "}
                              {seconds(project.voiceDurationMs || 0)}
                            </strong>
                            <audio
                              controls
                              src={media(project.voicePath)}
                              style={{ width: "100%" }}
                            />
                          </div>
                        )}
                        {project.flags.map((f, i) => (
                          <div key={i} className="info-note">
                            {f}
                          </div>
                        ))}
                      </section>
                    )}
                    {tab === 3 && (
                      <section className="card">
                        <div className="section-heading">
                          <div className="section-icon">
                            <Clock3 size={20} />
                          </div>
                          <div>
                            <h2>Timeline dựng</h2>
                            <p>
                              {hasVoice
                                ? "Cảnh đã được căn theo audio."
                                : "Thời gian tạm · cần tạo voice để chốt timing."}
                            </p>
                          </div>
                          <span className="tag">
                            {seconds(
                              duration +
                                (project.outro
                                  ? project.outroDurationMs || 0
                                  : 0),
                            )}{" "}
                            / {project.duration}s
                          </span>
                        </div>
                        {!project.beats.length ? (
                          <div className="empty-state">
                            <Clock3 size={38} />
                            <h3>Chưa có cảnh trên timeline</h3>
                            <p>Tạo kịch bản để lên thứ tự cảnh.</p>
                          </div>
                        ) : (
                          <>
                            <div className="timeline-strip">
                              {project.beats.map((b, i) => (
                                <button
                                  key={b.id}
                                  style={{ flex: b.durationMs }}
                                  onClick={() => setSelectedAsset(b.assetId)}
                                  title={b.voice}
                                >
                                  <span>{String(i + 1).padStart(2, "0")}</span>
                                  <small>{seconds(b.durationMs)}</small>
                                </button>
                              ))}
                            </div>
                            <div className="audio-track">
                              <AudioLines size={18} />
                              {hasVoice
                                ? "Voice ElevenLabs · Đã căn timestamp"
                                : "Chưa có voice"}
                            </div>
                            {project.outro && (
                              <div className="info-note">
                                <Film size={17} />
                                <span>
                                  Outro: {basename(project.outro)}
                                  {project.outroDurationMs
                                    ? ` · ${seconds(project.outroDurationMs)} cuối video`
                                    : " · Sẽ đọc thời lượng khi xuất"}
                                  . Phần nội dung được căn trước outro.
                                </span>
                              </div>
                            )}
                            <div className="timeline-list">
                              {timeline(project).map((b, i) => (
                                <div key={b.id} className="timeline-item">
                                  <span className="timecode">
                                    {seconds(b.timelineInMs)}
                                    <br />
                                    <small>{seconds(b.timelineOutMs)}</small>
                                  </span>
                                  <div>
                                    <b>
                                      {project.assets.find(
                                        (a) => a.id === b.assetId,
                                      )?.name || "Thiếu footage"}
                                    </b>
                                    <p>{b.voice}</p>
                                    <div className="timing-fields">
                                      <label>
                                        Điểm bắt đầu nguồn (s)
                                        <input
                                          type="number"
                                          min={0}
                                          step={0.1}
                                          value={b.sourceInMs / 1000}
                                          onChange={(e) => {
                                            const n = Number(e.target.value);
                                            if (n >= 0)
                                              update({
                                                beats: project.beats.map(
                                                  (x, j) =>
                                                    j === i
                                                      ? {
                                                          ...x,
                                                          sourceInMs:
                                                            Math.round(
                                                              n * 1000,
                                                            ),
                                                        }
                                                      : x,
                                                ),
                                              });
                                          }}
                                        />
                                      </label>
                                      <label>
                                        Độ dài cảnh (s)
                                        <input
                                          type="number"
                                          min={0.1}
                                          step={0.1}
                                          value={b.durationMs / 1000}
                                          onChange={(e) => {
                                            const n = Number(e.target.value);
                                            if (n >= 0.1)
                                              update({
                                                beats: project.beats.map(
                                                  (x, j) =>
                                                    j === i
                                                      ? {
                                                          ...x,
                                                          durationMs:
                                                            Math.round(
                                                              n * 1000,
                                                            ),
                                                        }
                                                      : x,
                                                ),
                                              });
                                          }}
                                        />
                                      </label>
                                    </div>
                                  </div>
                                  <div className="reorder">
                                    <button
                                      aria-label="Chuyển cảnh lên"
                                      disabled={i === 0}
                                      onClick={() => {
                                        const beats = [...project.beats];
                                        [beats[i - 1], beats[i]] = [
                                          beats[i],
                                          beats[i - 1],
                                        ];
                                        update({
                                          beats,
                                          captionCues: undefined,
                                        });
                                      }}
                                    >
                                      <ArrowLeft size={15} />
                                    </button>
                                    <button
                                      aria-label="Chuyển cảnh xuống"
                                      disabled={i === project.beats.length - 1}
                                      onClick={() => {
                                        const beats = [...project.beats];
                                        [beats[i + 1], beats[i]] = [
                                          beats[i],
                                          beats[i + 1],
                                        ];
                                        update({
                                          beats,
                                          captionCues: undefined,
                                        });
                                      }}
                                    >
                                      <ArrowRight size={15} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </section>
                    )}
                    {tab === 4 && (
                      <section className="card">
                        <div className="section-heading">
                          <div className="section-icon">
                            <Download size={20} />
                          </div>
                          <div>
                            <h2>Sẵn sàng chia sẻ câu chuyện</h2>
                            <p>
                              Xuất bản dựng hoặc bàn giao kế hoạch cho editor.
                            </p>
                          </div>
                        </div>
                        <div className="export-spec">
                          <Film size={30} />
                          <div>
                            <h3>MP4 · H.264 / AAC stereo</h3>
                            <p>
                              {project.ratio === "9:16"
                                ? "1080 × 1920"
                                : project.ratio === "1:1"
                                  ? "1080 × 1080"
                                  : "1920 × 1080"}{" "}
                              · 30 fps · BT.709
                            </p>
                          </div>
                          <span className="tag">{project.ratio}</span>
                        </div>
                        <div className="info-note">
                          Bản đầu hỗ trợ cắt thẳng, crop giữa khung, voice,
                          logo, thẻ chữ, phụ đề và nhạc nền tự hạ dưới voice.
                          Chưa có collage, nền mờ, chỉnh crop hoặc ghép intro tự
                          động. Outro được ghép cuối, giữ âm thanh gốc và tính
                          trong tổng thời lượng.
                        </div>
                        <div className="export-actions">
                          <button
                            className="primary"
                            onClick={() => step("render")}
                          >
                            <Download size={17} />
                            Xuất MP4
                          </button>
                          <button
                            className="secondary"
                            onClick={() =>
                              run(async () => {
                                const file = await api!.exportPlan(project);
                                if (file)
                                  setNotice(
                                    `Đã xuất JSON và SRT${hasVoice ? "" : " với timing tạm"}.`,
                                  );
                              })
                            }
                          >
                            Xuất timeline JSON + SRT
                          </button>
                          <button className="secondary" disabled={!project.beats.length} onClick={() => run(async () => {
                            if (!window.confirm("Đóng draft 1110 trong CapCut trước khi tiếp tục. Draft hiện tại sẽ được sao lưu và thay bằng timeline gồm các clip, voice, nhạc và chữ riêng để chỉnh sửa. Tiếp tục?")) return;
                            const folder = await api!.exportCapCut(project);
                            setNotice(`Đã xuất timeline chỉnh sửa vào ${folder}. Mở lại draft 1110 trong CapCut; kiểm tra bố cục chữ và âm lượng trước khi xuất video.`);
                          })}>
                            Xuất draft CapCut chỉnh sửa
                          </button>
                        </div>
                        {project.output && (
                          <div className="result-card">
                            <CheckCircle2 size={23} />
                            <div>
                              <b>Video đã được xuất</b>
                              <p>{basename(project.output)}</p>
                              {project.outputNotice && (
                                <p>{project.outputNotice}</p>
                              )}
                            </div>
                            <button
                              className="secondary"
                              onClick={() => api?.reveal(project.output!)}
                            >
                              <FolderOpen size={16} />
                              Mở thư mục
                            </button>
                            <button
                              className="secondary"
                              onClick={() =>
                                run(async () => {
                                  const p = await api!.saveVideoCopy(project);
                                  setProject(p);
                                  setNotice(
                                    p.outputNotice || "Đã lưu bản sao video.",
                                  );
                                })
                              }
                            >
                              <Save size={16} />
                              Lưu bản sao
                            </button>
                          </div>
                        )}
                      </section>
                    )}
                  </fieldset>
                  <div className="editor-footer">
                    <span>
                      <ShieldCheck size={15} />
                      Dự án lưu cục bộ trên thiết bị của bạn
                    </span>
                    <div>
                      {tab > 0 && (
                        <button
                          className="text-button"
                          onClick={() => setTab(tab - 1)}
                        >
                          <ArrowLeft size={16} />
                          Quay lại
                        </button>
                      )}
                      {tab < 4 && (
                        <button
                          className="secondary"
                          onClick={() => setTab(tab + 1)}
                        >
                          Tiếp tục
                          <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <aside className="preview-column">
                  <section className="card preview-card">
                    <div className="preview-heading">
                      <span>
                        <MonitorPlay size={16} />
                        Khung xem trước
                      </span>
                      <span className="tag">{project.ratio}</span>
                    </div>
                    <div
                      className={`phone-preview ratio-${project.ratio.replace(":", "-")}`}
                    >
                      {project.output ? (
                        <video
                          key={project.output}
                          src={media(project.output)}
                          controls
                        />
                      ) : selected ? (
                        <>
                          {selected.kind === "video" ? (
                            <video
                              key={selected.id}
                              src={media(selected.path)}
                              poster={media(selected.thumbnail)}
                              controls
                            />
                          ) : (
                            <img src={media(selected.path)} />
                          )}
                          <div className="source-label">FOOTAGE GỐC</div>
                        </>
                      ) : (
                        <div className="preview-placeholder">
                          <div className="frame-corners">
                            <Clapperboard size={35} />
                          </div>
                          <h3>
                            Câu chuyện của bạn
                            <br />
                            sắp thành hình.
                          </h3>
                          <p>
                            Thêm footage để bắt đầu
                            <br />
                            hành trình sáng tạo.
                          </p>
                          <span>THE HBG OFFICIAL</span>
                        </div>
                      )}
                    </div>
                    <div className="preview-meta">
                      <span>
                        <span className="tiny-dot" />
                        {project.output
                          ? "Bản MP4 đã xuất"
                          : selected
                            ? "Xem nguồn · chưa phải bản dựng"
                            : "Chưa có footage"}
                      </span>
                      <span>{project.duration}s · 30 fps</span>
                    </div>
                  </section>
                  <section className="preset-card">
                    <div className="preset-top">
                      <span className="sparkle-box">
                        <Sparkles size={18} />
                      </span>
                      <div>
                        <h3>The HBG Signature</h3>
                        <span>PRESET THƯƠNG HIỆU</span>
                      </div>
                      <CheckCircle2 size={18} />
                    </div>
                    <div className="preset-row">
                      <span>Nhịp dựng</span>
                      <b>2–4 giây / cảnh</b>
                    </div>
                    <div className="preset-row">
                      <span>Giọng đọc</span>
                      <b>Tiếng Việt</b>
                    </div>
                    <div className="preset-row">
                      <span>Phụ đề</span>
                      <b>
                        {project.category === "event"
                          ? "Tiếng Anh"
                          : "Tiếng Việt"}
                      </b>
                    </div>
                    <div className="palette">
                      <i />
                      <i />
                      <i />
                      <span>Xanh. Vàng. Chất HBG.</span>
                    </div>
                  </section>
                  <div className="readiness">
                    {[
                      "Ý tưởng đã sẵn sàng",
                      "Đã có footage",
                      "Footage được phân tích",
                      "Kịch bản đã tạo",
                      "Voice đã đồng bộ",
                      "MP4 đã xuất",
                    ].map((s, i) => (
                      <div key={s} className={readiness[i] ? "ready" : ""}>
                        <CheckCircle2 size={15} />
                        {s}
                      </div>
                    ))}
                  </div>
                  <button
                    className="generate-button"
                    disabled={busy}
                    onClick={generate}
                  >
                    {busy ? (
                      <LoaderCircle size={19} className="spin" />
                    ) : (
                      <Sparkles size={19} />
                    )}
                    Tạo video
                    <ArrowRight size={18} />
                  </button>
                  <p className="generate-hint">
                    Từ footage đến bản dựng, trong một luồng.
                    <br />
                    Sử dụng OpenAI & ElevenLabs của bạn.
                  </p>
                </aside>
              </div>
            </>
          )}
          <footer>
            CRAFTED FOR THE HBG OFFICIAL{" "}
            <span>Ý tưởng tốt. Câu chuyện hay.</span>
          </footer>
        </main>
      </div>
      {settingsOpen && (
        <SettingsModal
          status={status}
          close={() => setSettingsOpen(false)}
          saved={(s) => {
            setStatus(s);
            setNotice("Đã lưu cấu hình.");
          }}
          busy={busy}
        />
      )}
    </div>
  );
}
function SettingsModal({
  status,
  close,
  saved,
  busy,
}: {
  status?: SettingsStatus;
  close: () => void;
  saved: (s: SettingsStatus) => void;
  busy: boolean;
}) {
  const [form, setForm] = useState({
    geminiKey: "",
    geminiModel: status?.geminiModel || "gemini-3.8-flash",
    openaiKey: "",
    elevenKey: "",
    model: status?.model || "gpt-4.1-mini",
    voiceId: status?.voiceId || "",
    voiceModel: status?.voiceModel || "eleven_multilingual_v2",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="modal-header">
          <div>
            <div className="eyebrow">MAKE IT YOURS</div>
            <h2 id="settings-title">Cài đặt ứng dụng</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Đóng cài đặt"
            onClick={close}
          >
            <X size={20} />
          </button>
        </div>
        <p className="muted">
          Khóa API chỉ được sử dụng ở tiến trình main của Electron.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            setError("");
            try {
              if (!api) throw new Error("Cần mở ứng dụng Electron.");
              saved(await api.saveSettings(form));
              close();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setSaving(false);
            }
          }}
        >
          <fieldset disabled={busy || saving}>

            <label>
              OpenAI API key{" "}
              <span className="configured">
                {status?.openaiConfigured ? "Đã cấu hình" : "Chưa cấu hình"}
              </span>
              <input
                type="password"
                autoComplete="off"
                value={form.openaiKey}
                onChange={(e) =>
                  setForm({ ...form, openaiKey: e.target.value })
                }
                placeholder="Để trống để giữ khóa hiện tại"
              />
            </label>
            <label>
              OpenAI model
              <input
                value={form.model}
                required
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </label>
            <label>
              ElevenLabs API key{" "}
              <span className="configured">
                {status?.elevenConfigured ? "Đã cấu hình" : "Chưa cấu hình"}
              </span>
              <input
                type="password"
                autoComplete="off"
                value={form.elevenKey}
                onChange={(e) =>
                  setForm({ ...form, elevenKey: e.target.value })
                }
                placeholder="Để trống để giữ khóa hiện tại"
              />
            </label>
            <div className="two-cols">
              <label>
                Voice ID
                <input
                  value={form.voiceId}
                  onChange={(e) =>
                    setForm({ ...form, voiceId: e.target.value })
                  }
                  placeholder="Voice ID của bạn"
                />
              </label>
              <label>
                Voice model
                <input
                  value={form.voiceModel}
                  required
                  onChange={(e) =>
                    setForm({ ...form, voiceModel: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="info-note">
              <ShieldCheck size={17} />
              {status?.secureStorage
                ? "Khóa được mã hóa bằng Electron safeStorage trên thiết bị này."
                : "Nếu hệ điều hành không hỗ trợ mã hóa, khóa chỉ được giữ trong phiên."}
            </div>
            {error && <div className="alert error">{error}</div>}
            <button type="submit" className="primary">
              {saving ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                <Save size={17} />
              )}
              Lưu cấu hình
            </button>
          </fieldset>
        </form>
      </section>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
