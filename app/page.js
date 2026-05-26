"use client";

import { useState, useEffect, useRef } from "react";
import { db, storage } from "../lib/firebase";
import { ref as dbRef, onValue, set, update } from "firebase/database";
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";

const HABITS = [
  { id: "wake",     label: "Wake up at 5 AM",       icon: "🌅", color: "#FF6B35" },
  { id: "run",      label: "Morning Run",            icon: "🏃‍♀️", color: "#FF4757" },
  { id: "water",    label: "Drink 3L Water",         icon: "💧", color: "#1E90FF" },
  { id: "calories", label: "Calorie Deficit Diet",   icon: "🥗", color: "#2ED573" },
  { id: "fasting",  label: "Intermittent Fasting",   icon: "⏱️", color: "#ECCC68" },
  { id: "exercise", label: "Exercise 20–30 mins",    icon: "💪", color: "#A29BFE" },
  { id: "coding",   label: "3 Hours Coding",         icon: "💻", color: "#FD79A8" },
];

const QUOTES = [
  "She believed she could, so she did. 💫",
  "Every sunrise is a new chance, Shreyaa! 🌅",
  "Discipline is choosing between what you want now and what you want most. 🔥",
  "Small steps every day = massive results. 🚀",
  "Your future self will thank you for today. 💪",
  "Consistency is the mother of mastery. ✨",
];

function getDateKey(date) {
  return date.toISOString().split("T")[0];
}
function getStreak(logs, today) {
  let streak = 0;
  let d = new Date(today);
  while (true) {
    const key = getDateKey(d);
    const dayLog = logs[key];
    if (dayLog && HABITS.every((h) => dayLog[h.id])) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}
function getPerfectDays(logs) {
  return Object.values(logs).filter((day) => HABITS.every((h) => day[h.id])).length;
}
function getCompletionRate(logs, today) {
  const START = new Date("2025-06-01");
  const diff = Math.floor((today - START) / (1000 * 60 * 60 * 24));
  const daysSince = Math.max(1, diff);
  const total = Object.values(logs).reduce((a, d) => a + HABITS.filter((h) => d[h.id]).length, 0);
  return Math.min(100, Math.round((total / (daysSince * HABITS.length)) * 100));
}

// ─── Photo Upload Modal ───────────────────────────────────────────────────────
function PhotoModal({ habit, dateKey, existingPhoto, onClose, onUploaded, onDeleted }) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(existingPhoto || null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError("Photo must be under 10MB"); return; }
    setError("");
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    uploadFile(file);
  }

  async function uploadFile(file) {
    setUploading(true);
    const path = `proofs/${dateKey}/${habit.id}_${Date.now()}.jpg`;
    const sRef = storageRef(storage, path);
    const task = uploadBytesResumable(sRef, file);
    task.on("state_changed",
      (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => { setError("Upload failed. Try again."); setUploading(false); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        // Save url + storage path to DB
        await update(dbRef(db, `shreyaa/logs/${dateKey}`), {
          [`${habit.id}_photo`]: url,
          [`${habit.id}_photoPath`]: path,
          [habit.id]: true,
        });
        setUploading(false);
        onUploaded(url);
      }
    );
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      // We need the stored path to delete from Storage
      const updates = { [`${habit.id}_photo`]: null, [`${habit.id}_photoPath`]: null };
      await update(dbRef(db, `shreyaa/logs/${dateKey}`), updates);
      setPreview(null);
      onDeleted();
    } catch {
      setError("Couldn't remove photo.");
    }
    setDeleting(false);
  }

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "linear-gradient(135deg,#1A0A2E,#0D0D0D)",
        border: "1px solid rgba(162,155,254,0.2)", borderRadius: 24,
        padding: 24, width: "100%", maxWidth: 420, position: "relative",
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,0.08)",
          border: "none", color: "#fff", borderRadius: "50%", width: 32, height: 32,
          cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
        }}>✕</button>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>{habit.icon}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: habit.color, fontFamily: "'Playfair Display',serif" }}>{habit.label}</div>
          <div style={{ fontSize: 12, color: "#9B8FB0", marginTop: 4 }}>Upload a proof photo to verify this habit ✅</div>
        </div>

        {/* Preview */}
        {preview ? (
          <div style={{ position: "relative", marginBottom: 16 }}>
            <img src={preview} alt="proof" style={{
              width: "100%", borderRadius: 16, maxHeight: 280, objectFit: "cover",
              border: `2px solid ${habit.color}`,
            }} />
            {!uploading && (
              <div style={{ position: "absolute", bottom: 10, right: 10, display: "flex", gap: 8 }}>
                <button onClick={() => fileRef.current.click()} style={{
                  background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff", borderRadius: 10, padding: "6px 12px", cursor: "pointer", fontSize: 12,
                }}>📷 Change</button>
                <button onClick={handleDelete} disabled={deleting} style={{
                  background: "rgba(255,71,87,0.8)", border: "none",
                  color: "#fff", borderRadius: 10, padding: "6px 12px", cursor: "pointer", fontSize: 12,
                }}>{deleting ? "..." : "🗑️ Remove"}</button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => fileRef.current.click()} style={{
            width: "100%", padding: "40px 20px", borderRadius: 16, cursor: "pointer",
            border: `2px dashed ${habit.color}55`,
            background: `${habit.color}08`,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 16,
          }}>
            <div style={{ fontSize: 40 }}>📸</div>
            <div style={{ fontSize: 14, color: habit.color, fontWeight: 600 }}>Tap to upload proof</div>
            <div style={{ fontSize: 12, color: "#9B8FB0" }}>Photo or screenshot · Max 10MB</div>
          </button>
        )}

        {/* Upload progress */}
        {uploading && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#9B8FB0", marginBottom: 6 }}>
              <span>Uploading proof...</span><span>{progress}%</span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", width: progress + "%", background: habit.color, borderRadius: 6, transition: "width 0.2s" }} />
            </div>
          </div>
        )}

        {error && <div style={{ fontSize: 13, color: "#FF4757", marginBottom: 12, textAlign: "center" }}>{error}</div>}

        <input ref={fileRef} type="file" accept="image/*" capture="environment"
          style={{ display: "none" }} onChange={handleFile} />

        {preview && !uploading && (
          <button onClick={onClose} style={{
            width: "100%", padding: "13px", borderRadius: 14, border: "none",
            background: `linear-gradient(135deg,${habit.color},${habit.color}cc)`,
            color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>✅ Done</button>
        )}
      </div>
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ src, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <img src={src} alt="proof" style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 16, objectFit: "contain" }} />
      <button onClick={onClose} style={{
        position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.1)",
        border: "none", color: "#fff", borderRadius: "50%", width: 40, height: 40,
        cursor: "pointer", fontSize: 20,
      }}>✕</button>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function Home() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = getDateKey(today);

  const [logs, setLogs] = useState({});
  const [view, setView] = useState("today");
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [celebrate, setCelebrate] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [photoModal, setPhotoModal] = useState(null); // { habit, dateKey }
  const [lightbox, setLightbox] = useState(null);    // url string

  useEffect(() => {
    const logsRef = dbRef(db, "shreyaa/logs");
    const unsub = onValue(logsRef, (snap) => {
      setLogs(snap.val() || {});
      setLoaded(true);
    });
    return () => unsub();
  }, []);

  async function toggleHabit(dateKey, habitId) {
    const dayLog = logs[dateKey] || {};
    // Don't untick if photo exists — must remove photo first
    if (dayLog[habitId] && dayLog[`${habitId}_photo`]) return;
    const newVal = !dayLog[habitId];
    await update(dbRef(db, `shreyaa/logs/${dateKey}`), { [habitId]: newVal });
    if (newVal && dateKey === todayKey) {
      setCelebrate(habitId);
      setTimeout(() => setCelebrate(null), 900);
    }
  }

  function openPhotoModal(habit, dateKey) {
    setPhotoModal({ habit, dateKey });
  }

  const todayLog = logs[todayKey] || {};
  const todayCompleted = HABITS.filter((h) => todayLog[h.id]).length;
  const todayProgress = (todayCompleted / HABITS.length) * 100;
  const streak = getStreak(logs, today);
  const perfectDays = getPerfectDays(logs);
  const completionRate = getCompletionRate(logs, today);
  const quote = QUOTES[today.getDate() % QUOTES.length];
  const START_DATE = new Date("2025-06-01");
  const daysUntilStart = Math.max(0, Math.ceil((START_DATE - today) / (1000 * 60 * 60 * 24)));
  const isStarted = today >= START_DATE;

  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (13 - i));
    const key = getDateKey(d);
    const log = logs[key] || {};
    const count = HABITS.filter((h) => log[h.id]).length;
    return { key, d, count, full: count === HABITS.length };
  });

  const selLog = logs[selectedDate] || {};
  const selDate = new Date(selectedDate);
  const selCompleted = HABITS.filter((h) => selLog[h.id]).length;

  if (!loaded) return (
    <div style={{ minHeight: "100vh", background: "#0D0D0D", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 40 }}>💜</div>
      <div style={{ color: "#A29BFE", fontFamily: "DM Sans, sans-serif", fontSize: 16 }}>Loading Shreyaa's Journey...</div>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#0D0D0D 0%,#1A0A2E 50%,#0D0D0D 100%)",
      fontFamily: "'DM Sans',sans-serif", color: "#F0E6FF", overflowX: "hidden",
    }}>
      <style>{`
        @keyframes pop { 0%{transform:scale(1)} 50%{transform:scale(1.15)} 100%{transform:scale(1)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes twinkle { from{opacity:0.1} to{opacity:0.6} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        .habit-row { transition: all 0.25s ease; }
        .habit-row:hover { transform: translateY(-2px); }
        .celebrate { animation: pop 0.5s ease; }
        .photo-thumb:hover { opacity: 0.85; transform: scale(1.05); }
        .photo-thumb { transition: all 0.2s; cursor: pointer; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Stars */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute", borderRadius: "50%", background: "#fff",
            width: (i % 3 + 1) + "px", height: (i % 3 + 1) + "px",
            left: (i * 37 % 100) + "%", top: (i * 53 % 100) + "%",
            opacity: 0.15, animation: `twinkle ${2 + (i % 3)}s infinite alternate`,
          }} />
        ))}
      </div>

      {/* Modals */}
      {photoModal && (
        <PhotoModal
          habit={photoModal.habit}
          dateKey={photoModal.dateKey}
          existingPhoto={logs[photoModal.dateKey]?.[`${photoModal.habit.id}_photo`] || null}
          onClose={() => setPhotoModal(null)}
          onUploaded={(url) => { setPhotoModal(null); }}
          onDeleted={() => { setPhotoModal(null); }}
        />
      )}
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}

      <div style={{ position: "relative", zIndex: 1, maxWidth: 500, margin: "0 auto", padding: "24px 16px 100px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28, animation: "slideUp 0.5s ease" }}>
          <div style={{ fontSize: 12, letterSpacing: 4, color: "#A29BFE", textTransform: "uppercase", marginBottom: 8 }}>For my love ✨</div>
          <h1 style={{
            fontSize: 38, fontWeight: 900, margin: 0, fontFamily: "'Playfair Display',serif",
            background: "linear-gradient(90deg,#FF6B35,#FD79A8,#A29BFE)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Shreyaa's Journey</h1>
          <div style={{ fontSize: 13, color: "#9B8FB0", marginTop: 8, fontStyle: "italic" }}>"{quote}"</div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { val: streak, label: "Day Streak", icon: "🔥", color: "#FF6B35" },
            { val: perfectDays, label: "Perfect Days", icon: "⭐", color: "#ECCC68" },
            { val: completionRate + "%", label: "Success Rate", icon: "📈", color: "#2ED573" },
          ].map((s) => (
            <div key={s.label} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: "14px 8px", textAlign: "center",
            }}>
              <div style={{ fontSize: 20 }}>{s.icon}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1.2, fontFamily: "'Playfair Display',serif" }}>{s.val}</div>
              <div style={{ fontSize: 10, color: "#9B8FB0", marginTop: 2, letterSpacing: 0.5 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Nav */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: 4, marginBottom: 20, gap: 4 }}>
          {[{ id: "today", label: "Today" }, { id: "history", label: "History" }, { id: "stats", label: "Progress" }].map((tab) => (
            <button key={tab.id} onClick={() => setView(tab.id)} style={{
              flex: 1, padding: "10px 0", borderRadius: 11, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600, letterSpacing: 0.5, transition: "all 0.2s",
              background: view === tab.id ? "linear-gradient(135deg,#7C3AED,#A855F7)" : "transparent",
              color: view === tab.id ? "#fff" : "#9B8FB0",
            }}>{tab.label}</button>
          ))}
        </div>

        {/* ── TODAY ── */}
        {view === "today" && (
          <div style={{ animation: "slideUp 0.35s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div style={{ fontSize: 14, color: "#A29BFE", fontWeight: 600 }}>
                {today.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </div>
              {!isStarted && (
                <div style={{ marginTop: 8, padding: "7px 18px", background: "rgba(162,155,254,0.12)", borderRadius: 20, display: "inline-block", fontSize: 13, color: "#A29BFE" }}>
                  🚀 Journey starts in {daysUntilStart} day{daysUntilStart !== 1 ? "s" : ""}!
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: "#9B8FB0" }}>Today's Progress</span>
                <span style={{ color: "#A29BFE", fontWeight: 700 }}>{todayCompleted}/{HABITS.length}</span>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: todayProgress + "%", borderRadius: 10, transition: "width 0.4s ease",
                  background: todayProgress === 100 ? "linear-gradient(90deg,#2ED573,#00D2FF)" : "linear-gradient(90deg,#7C3AED,#FD79A8)",
                }} />
              </div>
              {todayProgress === 100 && (
                <div style={{ textAlign: "center", marginTop: 10, fontSize: 14, color: "#2ED573", fontWeight: 600, animation: "pulse 2s infinite" }}>
                  🎉 Perfect day! You're unstoppable, Shreyaa!
                </div>
              )}
            </div>

            {/* Habits list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {HABITS.map((h) => {
                const done = !!todayLog[h.id];
                const photoUrl = todayLog[`${h.id}_photo`];
                return (
                  <div key={h.id} className={`habit-row ${celebrate === h.id ? "celebrate" : ""}`}
                    style={{
                      background: done ? `linear-gradient(135deg,${h.color}22,${h.color}0a)` : "rgba(255,255,255,0.04)",
                      border: `1.5px solid ${done ? h.color : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 16, overflow: "hidden",
                    }}>
                    {/* Main row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
                      {/* Check toggle */}
                      <button onClick={() => toggleHabit(todayKey, h.id)} style={{
                        width: 44, height: 44, borderRadius: 12, flexShrink: 0, border: "none",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: done ? h.color : "rgba(255,255,255,0.06)", fontSize: 22, cursor: "pointer",
                        transition: "all 0.3s",
                      }}>{done ? "✓" : h.icon}</button>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: done ? h.color : "#E0D0FF" }}>{h.label}</div>
                        {photoUrl && (
                          <div style={{ fontSize: 11, color: "#2ED573", marginTop: 2 }}>📸 Proof uploaded ✓</div>
                        )}
                      </div>

                      {/* Photo button */}
                      <button
                        onClick={() => openPhotoModal(h, todayKey)}
                        title={photoUrl ? "View / change proof" : "Upload proof photo"}
                        style={{
                          background: photoUrl ? `${h.color}33` : "rgba(255,255,255,0.06)",
                          border: `1px solid ${photoUrl ? h.color : "rgba(255,255,255,0.12)"}`,
                          borderRadius: 10, padding: "6px 10px", cursor: "pointer",
                          fontSize: 16, flexShrink: 0, transition: "all 0.2s",
                        }}>
                        {photoUrl ? "🖼️" : "📷"}
                      </button>

                      {/* Done circle */}
                      <button onClick={() => toggleHabit(todayKey, h.id)} style={{
                        width: 22, height: 22, borderRadius: "50%", flexShrink: 0, border: `2px solid ${done ? h.color : "rgba(255,255,255,0.2)"}`,
                        background: done ? h.color : "transparent", display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: 11, color: "#fff", cursor: "pointer",
                      }}>{done ? "✓" : ""}</button>
                    </div>

                    {/* Photo thumbnail strip */}
                    {photoUrl && (
                      <div style={{ padding: "0 14px 12px", display: "flex", gap: 8 }}>
                        <img
                          src={photoUrl} alt="proof" className="photo-thumb"
                          onClick={() => setLightbox(photoUrl)}
                          style={{ height: 64, width: 90, objectFit: "cover", borderRadius: 10, border: `1.5px solid ${h.color}55` }}
                        />
                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
                          <div style={{ fontSize: 12, color: "#9B8FB0" }}>Tap photo to view full size</div>
                          <button onClick={() => openPhotoModal(h, todayKey)} style={{
                            background: "none", border: `1px solid rgba(255,255,255,0.12)`, color: "#9B8FB0",
                            borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 11,
                          }}>Change photo</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── HISTORY ── */}
        {view === "history" && (
          <div style={{ animation: "slideUp 0.35s ease" }}>
            <div style={{ fontSize: 13, color: "#9B8FB0", textAlign: "center", marginBottom: 14 }}>
              Last 14 days — tap a day to review
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 20 }}>
              {last14.map(({ key, d, count, full }) => (
                <button key={key} onClick={() => setSelectedDate(key)} style={{
                  aspectRatio: "1", borderRadius: 10, cursor: "pointer",
                  border: `2px solid ${selectedDate === key ? "#A29BFE" : "transparent"}`,
                  background: count === 0 ? "rgba(255,255,255,0.05)" : full ? "linear-gradient(135deg,#2ED573,#00D2FF)" : `rgba(162,155,254,${count / HABITS.length * 0.55 + 0.1})`,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 2,
                }}>
                  <div style={{ fontSize: 10, color: count === 0 ? "#555" : "#fff", fontWeight: 700 }}>{d.getDate()}</div>
                  <div style={{ fontSize: 8, color: count === 0 ? "#444" : "rgba(255,255,255,0.8)" }}>
                    {["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()]}
                  </div>
                  {count > 0 && <div style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>{count}/{HABITS.length}</div>}
                </button>
              ))}
            </div>

            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 14, color: "#A29BFE", fontWeight: 600, marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
                <span>{selDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</span>
                <span style={{ color: selCompleted === HABITS.length ? "#2ED573" : "#9B8FB0" }}>
                  {selCompleted}/{HABITS.length} {selCompleted === HABITS.length ? "⭐" : ""}
                </span>
              </div>
              {HABITS.map((h) => {
                const done = !!selLog[h.id];
                const photoUrl = selLog[`${h.id}_photo`];
                return (
                  <div key={h.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 10, marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button onClick={() => toggleHabit(selectedDate, h.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>
                        {done ? "✅" : "⬜"}
                      </button>
                      <span style={{ fontSize: 14, color: done ? h.color : "#7B6F8A", flex: 1 }}>{h.icon} {h.label}</span>
                      <button onClick={() => openPhotoModal(h, selectedDate)} style={{
                        background: photoUrl ? `${h.color}22` : "rgba(255,255,255,0.05)",
                        border: `1px solid ${photoUrl ? h.color : "rgba(255,255,255,0.1)"}`,
                        borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 13,
                      }}>{photoUrl ? "🖼️" : "📷"}</button>
                    </div>
                    {photoUrl && (
                      <div style={{ paddingLeft: 36, marginTop: 8 }}>
                        <img src={photoUrl} alt="proof" className="photo-thumb" onClick={() => setLightbox(photoUrl)}
                          style={{ height: 56, width: 80, objectFit: "cover", borderRadius: 8, border: `1.5px solid ${h.color}55` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STATS ── */}
        {view === "stats" && (
          <div style={{ animation: "slideUp 0.35s ease" }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#9B8FB0", marginBottom: 14, letterSpacing: 2, textTransform: "uppercase" }}>Habit Completion Rate</div>
              {HABITS.map((h) => {
                const total = Object.keys(logs).length;
                const done = Object.values(logs).filter((d) => d[h.id]).length;
                const photos = Object.values(logs).filter((d) => d[`${h.id}_photo`]).length;
                const rate = total === 0 ? 0 : Math.round((done / total) * 100);
                return (
                  <div key={h.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13, alignItems: "center" }}>
                      <span>{h.icon} {h.label}</span>
                      <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {photos > 0 && <span style={{ fontSize: 11, color: "#2ED573" }}>📸 {photos}</span>}
                        <span style={{ color: h.color, fontWeight: 700 }}>{rate}%</span>
                      </span>
                    </div>
                    <div style={{ height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 6, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: rate + "%", background: h.color, borderRadius: 6, transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Photo gallery */}
            {(() => {
              const allPhotos = [];
              Object.entries(logs).forEach(([date, dayLog]) => {
                HABITS.forEach((h) => {
                  if (dayLog[`${h.id}_photo`]) {
                    allPhotos.push({ url: dayLog[`${h.id}_photo`], habit: h, date });
                  }
                });
              });
              allPhotos.sort((a, b) => b.date.localeCompare(a.date));
              if (allPhotos.length === 0) return null;
              return (
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 16, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: "#9B8FB0", marginBottom: 12, letterSpacing: 2, textTransform: "uppercase" }}>
                    📸 Proof Gallery ({allPhotos.length})
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                    {allPhotos.slice(0, 12).map((p, i) => (
                      <div key={i} style={{ position: "relative" }}>
                        <img src={p.url} alt="proof" className="photo-thumb" onClick={() => setLightbox(p.url)}
                          style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 10, border: `1.5px solid ${p.habit.color}55` }} />
                        <div style={{
                          position: "absolute", bottom: 4, left: 4, right: 4,
                          background: "rgba(0,0,0,0.6)", borderRadius: 6, padding: "2px 5px",
                          fontSize: 9, color: "#fff", textAlign: "center",
                        }}>{p.habit.icon}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 16, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#9B8FB0", marginBottom: 12, letterSpacing: 2, textTransform: "uppercase" }}>14-Day Activity Map</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {last14.map(({ key, count }) => (
                  <div key={key} style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: count === 0 ? "rgba(255,255,255,0.05)" : count === HABITS.length ? "#2ED573" : `rgba(162,155,254,${count / HABITS.length})`,
                  }} />
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, fontSize: 11, color: "#9B8FB0", alignItems: "center" }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: "rgba(255,255,255,0.05)" }} /> None
                <div style={{ width: 12, height: 12, borderRadius: 3, background: "rgba(162,155,254,0.5)", marginLeft: 6 }} /> Partial
                <div style={{ width: 12, height: 12, borderRadius: 3, background: "#2ED573", marginLeft: 6 }} /> Perfect
              </div>
            </div>

            <div style={{
              borderRadius: 16, padding: 20, textAlign: "center",
              background: "linear-gradient(135deg,#7C3AED22,#FD79A822)",
              border: "1px solid rgba(253,121,168,0.2)",
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{streak >= 7 ? "🔥🔥🔥" : streak >= 3 ? "🔥🔥" : streak >= 1 ? "🔥" : "💫"}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#FD79A8", marginBottom: 6, fontFamily: "'Playfair Display',serif" }}>
                {streak === 0 ? "Start your streak today!" : `${streak}-Day Streak! Keep going!`}
              </div>
              <div style={{ fontSize: 13, color: "#9B8FB0", lineHeight: 1.7 }}>
                {streak >= 7 ? "You're on fire, Shreyaa! A whole week of consistency! 🌟"
                  : streak >= 3 ? "3+ days strong! The momentum is real! 💪"
                  : streak >= 1 ? "Great start! One day at a time. ✨"
                  : "Every champion was once a beginner. June 1st is day one! 🚀"}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, textAlign: "center",
        padding: "12px", background: "rgba(13,13,13,0.92)", backdropFilter: "blur(12px)",
        fontSize: 11, color: "#5A4F6A", letterSpacing: 1, zIndex: 10,
      }}>
        Made with 💜 · Shreyaa's Fitness Journey starts June 1, 2025
      </div>
    </div>
  );
}
