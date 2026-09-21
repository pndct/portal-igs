import React, { useCallback, useEffect, useMemo, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  addDoc,
  onSnapshot,
  query,
  deleteDoc,
} from "firebase/firestore";
import "./styles.css";

// ============================================================
// FIREBASE CONFIG
// ============================================================
// Ganti nilai di bawah dengan config Firebase yang sama seperti
// yang sudah Anda gunakan di CodeSandbox sebelumnya.
// Bisa juga memasukkan config melalui window.__firebase_config.
const FALLBACK_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCSzFjM6yM7kLl8lh8BXMcbT3cvdRjXMs0",
  authDomain: "portal-igs.firebaseapp.com",
  projectId: "portal-igs",
  storageBucket: "portal-igs.firebasestorage.app",
  messagingSenderId: "644724601752",
  appId: "1:644724601752:web:91b61284cbb732c49a71ed",
  measurementId: "G-PR11VKLQ3H",
};

function getFirebaseConfig() {
  if (typeof window !== "undefined" && window.__firebase_config) {
    try {
      return typeof window.__firebase_config === "string"
        ? JSON.parse(window.__firebase_config)
        : window.__firebase_config;
    } catch (error) {
      console.error("Invalid __firebase_config:", error);
    }
  }
  return FALLBACK_FIREBASE_CONFIG;
}

const firebaseConfig = getFirebaseConfig();
const firebaseReady = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId
);

let firebaseApp = null;
let auth = null;
let db = null;

if (firebaseReady) {
  firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
}

const APP_ID =
  typeof window !== "undefined" && window.__app_id
    ? window.__app_id
    : "igs-portal-1";
const getPublicPath = (col) => `artifacts/${APP_ID}/public/data/${col}`;

const ROLES = {
  admin: "Admin Sekolah",
  guru_kelas: "Guru Kelas",
  guru_mapel: "Guru Mapel",
  karyawan: "Karyawan / Staff",
};

const quotes = [
  "Pendidikan adalah senjata paling mematikan di dunia, karena dengan pendidikan, Anda dapat mengubah dunia. - Nelson Mandela",
  "Hiduplah seolah engkau mati besok. Belajarlah seolah engkau hidup selamanya. - Mahatma Gandhi",
  "Barangsiapa yang keluar untuk mencari ilmu, maka ia berada di jalan Allah hingga ia pulang. - HR. Tirmidzi",
  "Ilmu itu seperti air. Jika ia tidak bergerak, maka ia akan menjadi keruh lalu membusuk. - Imam Syafi'i",
  "Tujuan pendidikan itu untuk mempertajam kecerdasan, memperkukuh kemauan serta memperhalus perasaan. - Tan Malaka",
];

const emptyState = {
  user: null,
  userProfile: null,
  users: [],
  classes: [],
  students: [],
  printRequests: [],
  leaveRequests: [],
  attendance: [],
  grades: [],
  settings: { schoolYear: "2023/2024", principal: "Miftahul Huda, S.Pd" },
};

function Icon({ name, fill = false, className = "" }) {
  return (
    <i
      className={`${fill ? "ph-fill" : "ph"} ph-${name} ${className}`.trim()}
    />
  );
}

function ModalAlert({ alert, onClose }) {
  if (!alert.open) return null;
  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center">
      <div className="glass-panel p-6 max-w-sm w-full mx-4 alert-box-enter">
        <h3 className="text-xl font-bold mb-2">{alert.title}</h3>
        <p className="mb-6 opacity-80">{alert.message}</p>
        <div className="flex justify-end">
          <button onClick={onClose} className="glass-btn glass-btn-primary">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingOverlay({ show }) {
  if (!show) return null;
  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="animate-spin text-white">
        <Icon name="spinner-gap" className="text-5xl" />
      </div>
    </div>
  );
}

function AuthView({ onLogin, onRegister, loading }) {
  const [mode, setMode] = useState("login");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [register, setRegister] = useState({
    name: "",
    email: "",
    phone: "",
    role: "admin",
    password: "",
  });

  const submitLogin = (e) => {
    e.preventDefault();
    onLogin(login);
  };

  const submitRegister = (e) => {
    e.preventDefault();
    onRegister(register);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-panel max-w-md w-full p-8 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/30 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <Icon name="student" fill className="text-4xl text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Portal IGS</h1>
            <p className="opacity-70 mt-1">Islamic Global School PAUD-SD-SMP</p>
          </div>

          {mode === "login" ? (
            <form onSubmit={submitLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 opacity-80">
                  Email
                </label>
                <div className="relative">
                  <Icon
                    name="envelope"
                    className="absolute left-3 top-3.5 opacity-50"
                  />
                  <input
                    type="email"
                    className="glass-input pl-10"
                    placeholder="nama@igs.sch.id"
                    required
                    value={login.email}
                    onChange={(e) =>
                      setLogin({ ...login, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 opacity-80">
                  Password
                </label>
                <div className="relative">
                  <Icon
                    name="lock"
                    className="absolute left-3 top-3.5 opacity-50"
                  />
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    className="glass-input pl-10 pr-10"
                    placeholder="••••••••"
                    required
                    value={login.password}
                    onChange={(e) =>
                      setLogin({ ...login, password: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((v) => !v)}
                    className="absolute right-3 top-3.5 opacity-50 hover:opacity-100"
                  >
                    <Icon name={showLoginPassword ? "eye-slash" : "eye"} />
                  </button>
                </div>
                <div className="text-right mt-1">
                  <button
                    type="button"
                    className="text-xs text-blue-500 hover:underline"
                  >
                    Lupa Password?
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="glass-btn glass-btn-primary w-full mt-6"
                disabled={loading}
              >
                Masuk
              </button>
              <p className="text-center text-sm mt-4 opacity-80">
                Belum punya akun?{" "}
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="text-blue-500 font-semibold hover:underline"
                >
                  Daftar disini
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={submitRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 opacity-80">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="Masukkan nama"
                  required
                  value={register.name}
                  onChange={(e) =>
                    setRegister({ ...register, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 opacity-80">
                  Email
                </label>
                <input
                  type="email"
                  className="glass-input"
                  placeholder="nama@igs.sch.id"
                  required
                  value={register.email}
                  onChange={(e) =>
                    setRegister({ ...register, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 opacity-80">
                  No. WA
                </label>
                <input
                  type="tel"
                  className="glass-input"
                  placeholder="0812..."
                  required
                  value={register.phone}
                  onChange={(e) =>
                    setRegister({ ...register, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 opacity-80">
                  Jenis Akun
                </label>
                <select
                  className="glass-input"
                  value={register.role}
                  onChange={(e) =>
                    setRegister({ ...register, role: e.target.value })
                  }
                >
                  <option value="admin">Admin Sekolah</option>
                  <option value="guru_kelas">Guru Kelas</option>
                  <option value="guru_mapel">Guru Mapel</option>
                  <option value="karyawan">Karyawan / Staff</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 opacity-80">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showRegPassword ? "text" : "password"}
                    className="glass-input pr-10"
                    required
                    value={register.password}
                    onChange={(e) =>
                      setRegister({ ...register, password: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword((v) => !v)}
                    className="absolute right-3 top-3.5 opacity-50 hover:opacity-100"
                  >
                    <Icon name={showRegPassword ? "eye-slash" : "eye"} />
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="glass-btn glass-btn-primary w-full mt-6"
                disabled={loading}
              >
                Daftar Akun
              </button>
              <p className="text-center text-sm mt-4 opacity-80">
                Sudah punya akun?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-blue-500 font-semibold hover:underline"
                >
                  Masuk
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ profile }) {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  const quote = quotes[dayOfYear % quotes.length];
  return (
    <>
      <div className="glass-panel p-6 mb-6">
        <h2 className="text-2xl font-bold mb-2">
          Selamat Datang, {profile?.name || "User"}!
        </h2>
        <p className="opacity-80">
          {new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 relative overflow-hidden">
          <Icon
            name="quotes"
            fill
            className="absolute -top-4 -right-4 text-8xl opacity-10 text-blue-500"
          />
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Icon name="lightbulb" className="text-yellow-500" /> Kutipan Hari
            Ini
          </h3>
          <p className="italic opacity-90 leading-relaxed">“{quote}”</p>
        </div>
        <div className="glass-panel p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Icon name="newspaper" className="text-blue-500" /> Info & Berita
          </h3>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-3">
              <h4 className="font-semibold text-sm">
                Persiapan Ujian Semester
              </h4>
              <p className="text-xs opacity-70 mt-1">
                Harap segera mengumpulkan soal ujian maksimal hari Jumat.
              </p>
            </div>
            <div className="border-l-4 border-purple-500 pl-3">
              <h4 className="font-semibold text-sm">Rapat Rutin Guru</h4>
              <p className="text-xs opacity-70 mt-1">
                Rapat evaluasi bulanan akan diadakan pada akhir bulan di aula.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function PrintView({ state, showAlert, setLoading }) {
  const isAdmin = state.userProfile?.role === "admin";
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState({
    documentName: "",
    type: "Print Warna",
    copies: 1,
    dateNeeded: "",
  });
  const requests = useMemo(() => {
    return [...state.printRequests]
      .filter((r) => isAdmin || r.userId === state.userProfile?.id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [state.printRequests, isAdmin, state.userProfile?.id]);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, getPublicPath("print_requests")), {
        userId: state.userProfile.id,
        userName: state.userProfile.name,
        documentName: form.documentName,
        type: form.type,
        copies: String(form.copies),
        dateNeeded: form.dateNeeded,
        status: "pending",
        handlerName: "",
        timestamp: new Date().toISOString(),
      });
      setOpenForm(false);
      setForm({
        documentName: "",
        type: "Print Warna",
        copies: 1,
        dateNeeded: "",
      });
      showAlert("Sukses", "Pengajuan berhasil dikirim.");
    } catch (error) {
      showAlert("Error", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, status) {
    try {
      await updateDoc(doc(db, getPublicPath("print_requests"), id), {
        status,
        handlerName: state.userProfile.name,
      });
    } catch (error) {
      showAlert("Error", error.message);
    }
  }

  async function removeRequest(id) {
    if (!window.confirm("Yakin membatalkan pengajuan ini?")) return;
    try {
      await deleteDoc(doc(db, getPublicPath("print_requests"), id));
    } catch (error) {
      showAlert("Error", error.message);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold">Pengajuan Print / Fotocopy</h2>
        {!isAdmin && (
          <button
            onClick={() => setOpenForm((v) => !v)}
            className="glass-btn glass-btn-primary"
          >
            <Icon name="plus" /> Buat Pengajuan
          </button>
        )}
      </div>
      {openForm && !isAdmin && (
        <div className="glass-panel p-6 mb-6">
          <h3 className="font-bold mb-4">Form Pengajuan Baru</h3>
          <form
            onSubmit={submit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm mb-1 opacity-80">
                Nama Dokumen
              </label>
              <input
                className="glass-input"
                required
                value={form.documentName}
                onChange={(e) =>
                  setForm({ ...form, documentName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1 opacity-80">
                Jenis / Layanan
              </label>
              <select
                className="glass-input"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option>Print Warna</option>
                <option>Print Hitam Putih</option>
                <option>Fotocopy</option>
                <option>Laminating</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1 opacity-80">
                Jumlah (Rangkap)
              </label>
              <input
                type="number"
                min="1"
                className="glass-input"
                required
                value={form.copies}
                onChange={(e) => setForm({ ...form, copies: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm mb-1 opacity-80">
                Dipakai Kapan?
              </label>
              <input
                type="date"
                className="glass-input"
                required
                value={form.dateNeeded}
                onChange={(e) =>
                  setForm({ ...form, dateNeeded: e.target.value })
                }
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setOpenForm(false)}
                className="glass-btn"
              >
                Batal
              </button>
              <button type="submit" className="glass-btn glass-btn-primary">
                Kirim Pengajuan
              </button>
            </div>
          </form>
        </div>
      )}
      <div className="glass-panel overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 dark:border-white/10 opacity-80">
            <tr>
              <th className="p-4">Tanggal</th>
              {isAdmin && <th className="p-4">Pemohon</th>}
              <th className="p-4">Dokumen</th>
              <th className="p-4">Layanan</th>
              <th className="p-4">Status</th>
              <th className="p-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 6 : 5}
                  className="p-8 text-center opacity-50"
                >
                  Belum ada data pengajuan.
                </td>
              </tr>
            ) : (
              requests.map((req) => {
                const statusText =
                  req.status === "printing"
                    ? "Sedang Diproses"
                    : req.status === "done"
                    ? "Selesai"
                    : "Menunggu";
                const statusClass =
                  req.status === "pending"
                    ? "status-pending"
                    : req.status === "printing"
                    ? "status-printing"
                    : "status-done";
                return (
                  <tr
                    key={req.id}
                    className="border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4">
                      {new Date(req.timestamp).toLocaleDateString("id-ID")}
                    </td>
                    {isAdmin && (
                      <td className="p-4 font-medium">{req.userName}</td>
                    )}
                    <td className="p-4">
                      <div className="font-medium">{req.documentName}</div>
                      <div className="text-xs opacity-70">
                        {req.copies} rangkap | Pst: {req.dateNeeded}
                      </div>
                    </td>
                    <td className="p-4">{req.type}</td>
                    <td className="p-4">
                      <span className={`status-badge ${statusClass}`}>
                        {statusText}
                      </span>
                      {req.handlerName && (
                        <div className="text-xs opacity-60 mt-1">
                          Oleh: {req.handlerName}
                        </div>
                      )}
                    </td>
                    <td className="p-4 space-x-3">
                      {isAdmin && req.status === "pending" && (
                        <button
                          onClick={() => updateStatus(req.id, "printing")}
                          className="text-blue-500 text-xs font-semibold"
                        >
                          Ambil Job
                        </button>
                      )}
                      {isAdmin && req.status === "printing" && (
                        <button
                          onClick={() => updateStatus(req.id, "done")}
                          className="text-green-500 text-xs font-semibold"
                        >
                          Tandai Selesai
                        </button>
                      )}
                      {!isAdmin && req.status === "pending" && (
                        <button
                          onClick={() => removeRequest(req.id)}
                          className="text-red-500 text-xs font-semibold"
                        >
                          Batal
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AttendanceView({ state, showAlert, setLoading }) {
  const isAdmin = state.userProfile?.role === "admin";
  const accessibleClasses = useMemo(
    () =>
      isAdmin
        ? state.classes
        : state.classes.filter(
            (c) =>
              c.homeroomTeacherId === state.userProfile?.id ||
              state.userProfile?.classes?.includes(c.id)
          ),
    [state.classes, state.userProfile, isAdmin]
  );
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState({});
  const [docId, setDocId] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!classId || !date) {
        setRecords({});
        setDocId(null);
        setLoaded(false);
        return;
      }
      setLoaded(false);
      try {
        const students = state.students
          .filter((s) => s.classId === classId)
          .sort((a, b) => a.name.localeCompare(b.name));
        const snap = await getDocs(
          query(collection(db, getPublicPath("attendance")))
        );
        let existing = {};
        let foundId = null;
        snap.forEach((d) => {
          const data = d.data();
          if (data.classId === classId && data.date === date) {
            existing = data.records || {};
            foundId = d.id;
          }
        });
        if (!cancelled) {
          const next = {};
          students.forEach((s) => {
            next[s.id] = existing[s.id] || "H";
          });
          setRecords(next);
          setDocId(foundId);
          setLoaded(true);
        }
      } catch (error) {
        if (!cancelled) showAlert("Error", error.message);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [classId, date, state.students, showAlert]);

  const students = useMemo(
    () =>
      state.students
        .filter((s) => s.classId === classId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [state.students, classId]
  );

  async function save() {
    if (!classId || !date)
      return showAlert("Error", "Pilih kelas dan tanggal.");
    setLoading(true);
    try {
      if (docId)
        await updateDoc(doc(db, getPublicPath("attendance"), docId), {
          records,
        });
      else
        await addDoc(collection(db, getPublicPath("attendance")), {
          classId,
          date,
          records,
        });
      showAlert("Sukses", "Data absensi berhasil disimpan.");
    } catch (error) {
      showAlert("Error", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function exportPDF() {
    if (!classId) return showAlert("Error", "Pilih kelas terlebih dahulu.");
    if (!window.jspdf?.jsPDF)
      return showAlert(
        "Error",
        "Library PDF belum termuat. Coba refresh halaman."
      );
    const PDF = window.jspdf.jsPDF;
    const doc = new PDF("landscape", "mm", "a4");
    const classData = state.classes.find((c) => c.id === classId);
    const className = classData?.name || "";
    const schoolYear = state.settings?.schoolYear || "";
    const principal = state.settings?.principal || "";
    const teacherName = state.userProfile?.name || "";
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("ISLAMIC GLOBAL SCHOOL", 148, 20, { align: "center" });
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("PAUD - SD - SMP", 148, 28, { align: "center" });
    doc.setFontSize(10);
    doc.text("Jl. Pendidikan No. 1, Kota Balikpapan", 148, 34, {
      align: "center",
    });
    doc.setLineWidth(0.5);
    doc.line(14, 38, 283, 38);
    doc.setLineWidth(0.1);
    doc.line(14, 39, 283, 39);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DAFTAR HADIR SISWA", 148, 50, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Tahun Ajaran : ${schoolYear}`, 14, 60);
    doc.text(`Kelas        : ${className}`, 14, 66);
    doc.text(`Tanggal      : ${date}`, 14, 72);
    const body = students.map((student, index) => [
      index + 1,
      student.nis || "-",
      student.nisn || "-",
      student.name,
      student.nickname || "-",
      student.gender || "-",
      records[student.id] || "-",
    ]);
    if (typeof doc.autoTable === "function")
      doc.autoTable({
        startY: 78,
        head: [
          [
            "No",
            "NIS",
            "NISN",
            "Nama Lengkap",
            "Panggilan",
            "L/P",
            "Status (H/S/I/A/T)",
          ],
        ],
        body,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 },
      });
    const finalY = (doc.lastAutoTable?.finalY || 100) + 20;
    doc.text(
      `Balikpapan, ${new Date().toLocaleDateString("id-ID")}`,
      240,
      finalY,
      { align: "center" }
    );
    doc.text("Mengetahui,", 50, finalY);
    doc.text("Kepala Sekolah", 50, finalY + 5);
    doc.text(principal, 50, finalY + 25, { align: "center" });
    doc.text("Guru Kelas", 240, finalY + 5, { align: "center" });
    doc.text(teacherName, 240, finalY + 25, { align: "center" });
    doc.save(`Absensi_${className}_${date}.pdf`);
  }

  const statuses = ["H", "S", "I", "A", "T"];
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Absensi Siswa</h2>
      </div>
      <div className="glass-panel p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm mb-1 opacity-80">Pilih Kelas</label>
            <select
              className="glass-input"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">-- Pilih Kelas --</option>
              {accessibleClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 opacity-80">Tanggal</label>
            <input
              type="date"
              className="glass-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              className="glass-btn glass-btn-primary flex-1"
            >
              <Icon name="floppy-disk" /> Simpan
            </button>
            <button onClick={exportPDF} className="glass-btn flex-1">
              <Icon name="file-pdf" className="text-red-500" /> Export PDF
            </button>
          </div>
        </div>
      </div>
      {classId && (
        <div className="glass-panel overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 dark:border-white/10 opacity-80">
              <tr>
                <th className="p-3">No</th>
                <th className="p-3">NIS/NISN</th>
                <th className="p-3">Nama Lengkap</th>
                {statuses.map((s) => (
                  <th key={s} className="p-3 text-center">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loaded && students.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center opacity-50">
                    Belum ada data siswa di kelas ini.
                  </td>
                </tr>
              )}
              {!loaded && (
                <tr>
                  <td colSpan={8} className="p-8 text-center opacity-50">
                    Loading...
                  </td>
                </tr>
              )}
              {loaded &&
                students.map((student, index) => (
                  <tr
                    key={student.id}
                    className="border-b border-black/5 dark:border-white/5"
                  >
                    <td className="p-3">{index + 1}</td>
                    <td className="p-3 text-xs">
                      {student.nis || "-"} / {student.nisn || "-"}
                    </td>
                    <td className="p-3 font-medium">{student.name}</td>
                    {statuses.map((status) => (
                      <td key={status} className="p-3 text-center">
                        <input
                          type="radio"
                          name={`att-${student.id}`}
                          checked={records[student.id] === status}
                          onChange={() =>
                            setRecords((r) => ({ ...r, [student.id]: status }))
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
          <div className="p-4 text-xs opacity-70">
            Keterangan: H=Hadir, S=Sakit, I=Izin, A=Alpa, T=Terlambat
          </div>
        </div>
      )}
    </div>
  );
}

function GradesView() {
  return (
    <div className="glass-panel p-6 text-center">
      <Icon name="exam" className="text-6xl opacity-20 mb-4 inline-block" />
      <h2 className="text-2xl font-bold mb-2">Input Nilai Siswa</h2>
      <p className="opacity-70 mb-6">
        Fitur input nilai per tugas & export PDF Portrait (Upcoming Update).
      </p>
    </div>
  );
}
function LeaveView() {
  return (
    <div className="glass-panel p-6 text-center">
      <Icon name="sign-out" className="text-6xl opacity-20 mb-4 inline-block" />
      <h2 className="text-2xl font-bold mb-2">Izin Sementara Keluar</h2>
      <p className="opacity-70 mb-6">
        Fitur pengajuan izin keluar sekolah di jam kerja sedang dalam
        pengembangan (Upcoming Update).
      </p>
      <button className="glass-btn opacity-50 cursor-not-allowed">
        Ajukan Izin Baru
      </button>
    </div>
  );
}

function AdminView({ state, showAlert, setLoading }) {
  const [tab, setTab] = useState("users");
  const [className, setClassName] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [importClassId, setImportClassId] = useState("");
  const [importText, setImportText] = useState("");
  const [year, setYear] = useState(state.settings?.schoolYear || "");
  const [principal, setPrincipal] = useState(state.settings?.principal || "");
  const teachers = state.users.filter(
    (u) => u.role?.includes("guru") && u.status === "approved"
  );

  useEffect(() => {
    if (!importClassId && state.classes[0])
      setImportClassId(state.classes[0].id);
  }, [state.classes, importClassId]);
  useEffect(() => {
    setYear(state.settings?.schoolYear || "");
    setPrincipal(state.settings?.principal || "");
  }, [state.settings]);

  async function approveUser(uid) {
    try {
      await updateDoc(doc(db, getPublicPath("users"), uid), {
        status: "approved",
      });
      showAlert("Sukses", "User disetujui.");
    } catch (e) {
      showAlert("Error", e.message);
    }
  }
  async function deleteUser(uid) {
    if (!window.confirm("Hapus user ini dari database?")) return;
    try {
      await deleteDoc(doc(db, getPublicPath("users"), uid));
    } catch (e) {
      showAlert("Error", e.message);
    }
  }
  async function addClass(e) {
    e.preventDefault();
    try {
      await addDoc(collection(db, getPublicPath("classes")), {
        name: className,
        homeroomTeacherId: teacherId,
      });
      setClassName("");
      setTeacherId("");
      showAlert("Sukses", "Kelas berhasil ditambahkan.");
    } catch (e) {
      showAlert("Error", e.message);
    }
  }
  async function deleteClass(id) {
    if (!window.confirm("Hapus kelas?")) return;
    try {
      await deleteDoc(doc(db, getPublicPath("classes"), id));
    } catch (e) {
      showAlert("Error", e.message);
    }
  }
  async function processImport() {
    if (!importClassId || !importText.trim())
      return showAlert("Error", "Isi data dan pilih kelas.");
    setLoading(true);
    let count = 0;
    try {
      for (const line of importText.split("\n")) {
        if (!line.trim()) continue;
        const parts = line.split(/,|\t/).map((s) => s.trim());
        if (parts.length >= 5) {
          await addDoc(collection(db, getPublicPath("students")), {
            nis: parts[0],
            nisn: parts[1],
            name: parts[2],
            nickname: parts[3],
            gender: parts[4],
            classId: importClassId,
          });
          count += 1;
        }
      }
      setImportText("");
      showAlert("Berhasil", `${count} siswa berhasil diimport.`);
    } catch (e) {
      showAlert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }
  async function saveSettings() {
    try {
      await setDoc(
        doc(db, getPublicPath("settings"), "global"),
        { schoolYear: year, principal },
        { merge: true }
      );
      showAlert("Sukses", "Pengaturan disimpan.");
    } catch (e) {
      showAlert("Error", e.message);
    }
  }

  const tabs = [
    ["users", "Manajemen Akun"],
    ["classes", "Kelas & Guru"],
    ["students", "Data Siswa"],
    ["settings", "Pengaturan"],
  ];
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Super Admin Dashboard</h2>
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`glass-btn admin-tab-btn ${
              tab === id ? "glass-btn-primary" : ""
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <div className="glass-panel overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 dark:border-white/10 opacity-80">
              <tr>
                <th className="p-3">Nama</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {state.users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-black/5 dark:border-white/5"
                >
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3 text-xs">{u.email}</td>
                  <td className="p-3 text-xs">
                    {String(u.role || "").replace("_", " ")}
                  </td>
                  <td className="p-3">
                    <span
                      className={`status-badge ${
                        u.status === "approved"
                          ? "status-done"
                          : "status-pending"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {u.status === "pending" && (
                      <button
                        onClick={() => approveUser(u.id)}
                        className="text-blue-500 text-xs"
                      >
                        Setujui
                      </button>
                    )}
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="text-red-500 text-xs ml-3"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "classes" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6">
            <h3 className="font-bold mb-4">Tambah Kelas</h3>
            <form onSubmit={addClass} className="space-y-4">
              <div>
                <label className="block text-sm mb-1 opacity-80">
                  Nama Kelas
                </label>
                <input
                  className="glass-input"
                  placeholder="Contoh: 1A SD"
                  required
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm mb-1 opacity-80">
                  Wali Kelas
                </label>
                <select
                  className="glass-input"
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                >
                  <option value="">Pilih Guru...</option>
                  {teachers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="glass-btn glass-btn-primary w-full"
              >
                Simpan Kelas
              </button>
            </form>
          </div>
          <div className="md:col-span-2 glass-panel p-0 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/10 dark:border-white/10 opacity-80">
                <tr>
                  <th className="p-4">Nama Kelas</th>
                  <th className="p-4">Wali Kelas</th>
                  <th className="p-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {state.classes.map((c) => {
                  const teacher = state.users.find(
                    (u) => u.id === c.homeroomTeacherId
                  );
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-black/5 dark:border-white/5"
                    >
                      <td className="p-4 font-bold">{c.name}</td>
                      <td className="p-4 opacity-80">{teacher?.name || "-"}</td>
                      <td className="p-4">
                        <button
                          onClick={() => deleteClass(c.id)}
                          className="text-red-500 text-xs"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "students" && (
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h3 className="font-bold mb-4">Import Data Siswa</h3>
            <p className="text-sm opacity-70 mb-4">
              Paste data dari Excel. Format:{" "}
              <b>NIS, NISN, Nama Lengkap, Panggilan, L/P</b>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm mb-1 opacity-80">
                  Pilih Kelas
                </label>
                <select
                  className="glass-input"
                  value={importClassId}
                  onChange={(e) => setImportClassId(e.target.value)}
                >
                  {state.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <textarea
              rows="6"
              className="glass-input font-mono text-xs w-full mb-4"
              placeholder="1234, 001234, Ahmad Budi, Budi, L\n..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <button
              onClick={processImport}
              className="glass-btn glass-btn-primary"
            >
              <Icon name="upload" /> Proses Import
            </button>
          </div>
          <div className="glass-panel p-4">
            <h4 className="font-bold mb-2">
              Total Siswa: {state.students.length}
            </h4>
            <div className="text-xs opacity-70">
              Data siswa akan tampil berdasarkan kelas saat di menu absensi.
            </div>
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div className="glass-panel p-6">
          <h3 className="font-bold mb-4">Pengaturan Global</h3>
          <div className="max-w-md space-y-4">
            <div>
              <label className="block text-sm mb-1 opacity-80">
                Tahun Ajaran
              </label>
              <input
                className="glass-input"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1 opacity-80">
                Nama Kepala Sekolah
              </label>
              <input
                className="glass-input"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
              />
            </div>
            <button
              onClick={saveSettings}
              className="glass-btn glass-btn-primary mt-4"
            >
              Simpan Perubahan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Navigation({
  state,
  currentView,
  setCurrentView,
  toggleTheme,
  theme,
  logout,
}) {
  const role = state.userProfile?.role;
  const canPrint = ["admin", "guru_kelas", "guru_mapel"].includes(role);
  const canAttendance = ["admin", "guru_kelas"].includes(role);
  const canGrades = ["admin", "guru_kelas", "guru_mapel"].includes(role);
  const items = [
    { id: "dashboard", icon: "squares-four", label: "Dashboard", show: true },
    { id: "print", icon: "printer", label: "Pengajuan Print", show: canPrint },
    {
      id: "attendance",
      icon: "calendar-check",
      label: "Absensi",
      show: canAttendance,
    },
    { id: "grades", icon: "exam", label: "Nilai", show: canGrades },
    { id: "leave", icon: "sign-out", label: "Izin Keluar", show: true },
    {
      id: "admin",
      icon: "shield-star",
      label: "Super Admin",
      show: role === "admin",
    },
  ];
  return (
    <nav className="glass-panel rounded-none md:w-64 flex-shrink-0 flex flex-row md:flex-col justify-between md:justify-start fixed md:relative bottom-0 md:bottom-auto w-full z-40 border-t md:border-t-0 md:border-r border-white/20 h-16 md:h-full p-2 md:p-4">
      <div className="hidden md:flex items-center gap-3 mb-8 px-2 mt-4">
        <div className="w-10 h-10 bg-white/90 rounded-xl flex items-center justify-center shadow-sm">
          <Icon name="student" fill className="text-2xl text-blue-600" />
        </div>
        <div>
          <h2 className="font-bold text-lg leading-tight">Portal IGS</h2>
          <p className="text-xs opacity-70">PAUD-SD-SMP</p>
        </div>
      </div>
      <div className="flex flex-row md:flex-col w-full justify-around md:justify-start gap-1 md:gap-2 overflow-x-auto md:overflow-visible">
        {items
          .filter((i) => i.show)
          .map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`nav-btn flex md:w-full items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/20 ${
                currentView === item.id ? "active-nav" : ""
              }`}
            >
              <Icon name={item.icon} className="text-xl" />
              <span className="hidden md:inline font-medium">{item.label}</span>
            </button>
          ))}
      </div>
      <div className="hidden md:flex flex-col mt-auto gap-4">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/20 w-full text-left"
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} className="text-xl" />
          <span className="font-medium">Mode Tampilan</span>
        </button>
        <button
          onClick={logout}
          className="glass-panel p-3 flex items-center gap-3 text-left hover:bg-white/10 transition"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
            {state.userProfile?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold truncate">
              {state.userProfile?.name || "User Name"}
            </p>
            <p className="text-xs opacity-70 truncate capitalize">
              {ROLES[role] || role}
            </p>
          </div>
          <Icon name="sign-out" className="text-red-500" />
        </button>
      </div>
    </nav>
  );
}

function MainLayout({
  state,
  currentView,
  setCurrentView,
  toggleTheme,
  theme,
  logout,
  children,
}) {
  return (
    <div className="h-screen w-full flex flex-col md:flex-row">
      <Navigation
        state={state}
        currentView={currentView}
        setCurrentView={setCurrentView}
        toggleTheme={toggleTheme}
        theme={theme}
        logout={logout}
      />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 p-4 md:p-8 relative">
        <div className="md:hidden flex justify-between items-center mb-6 glass-panel p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
              {state.userProfile?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold truncate max-w-[120px]">
                {state.userProfile?.name || "User"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-white/20"
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} />
            </button>
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-red-500/20 text-red-500"
            >
              <Icon name="sign-out" />
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto space-y-6">{children}</div>
      </main>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState(emptyState);
  const [currentView, setCurrentView] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, title: "", message: "" });
  const [theme, setTheme] = useState(
    () => localStorage.getItem("igs-theme") || "light"
  );
  const [authReady, setAuthReady] = useState(false);

  const showAlert = useCallback(
    (title, message) => setAlert({ open: true, title, message }),
    []
  );
  const closeAlert = useCallback(
    () => setAlert((a) => ({ ...a, open: false })),
    []
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme !== "dark");
    localStorage.setItem("igs-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!firebaseReady || !auth || !db) {
      setLoading(false);
      setAuthReady(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (!user) {
        setState((s) => ({ ...s, user: null, userProfile: null }));
        setLoading(false);
        setAuthReady(true);
        return;
      }
      try {
        const profileSnap = await getDoc(
          doc(db, getPublicPath("users"), user.uid)
        );
        if (!profileSnap.exists()) {
          setState((s) => ({ ...s, user, userProfile: null }));
          await signOut(auth);
        } else {
          const profile = { id: profileSnap.id, ...profileSnap.data() };
          if (profile.status !== "approved") {
            showAlert(
              "Menunggu Persetujuan",
              "Akun Anda sedang menunggu persetujuan Admin."
            );
            await signOut(auth);
          } else {
            setState((s) => ({ ...s, user, userProfile: profile }));
            setCurrentView("dashboard");
          }
        }
      } catch (error) {
        console.error(error);
        showAlert("Firebase Error", error.message);
      } finally {
        setLoading(false);
        setAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, [showAlert]);

  useEffect(() => {
    if (!firebaseReady || !db || !state.userProfile) return undefined;
    const cols = [
      "users",
      "classes",
      "students",
      "print_requests",
      "leave_requests",
      "settings",
    ];
    const unsubscribers = cols.map((colName) =>
      onSnapshot(
        query(collection(db, getPublicPath(colName))),
        (snapshot) => {
          const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          setState((s) => {
            const next = { ...s };
            if (colName === "users") next.users = data;
            if (colName === "classes") next.classes = data;
            if (colName === "students") next.students = data;
            if (colName === "print_requests") next.printRequests = data;
            if (colName === "leave_requests") next.leaveRequests = data;
            if (colName === "settings") {
              const global = data.find((d) => d.id === "global");
              if (global) next.settings = global;
            }
            return next;
          });
        },
        (error) => console.error(`Error listening to ${colName}:`, error)
      )
    );
    return () => unsubscribers.forEach((unsub) => unsub());
  }, [state.userProfile]);

  async function login(credentials) {
    if (!firebaseReady || !auth)
      return showAlert(
        "Firebase Belum Diatur",
        "Masukkan Firebase config Anda di App.jsx terlebih dahulu."
      );
    setLoading(true);
    try {
      await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );
    } catch (error) {
      showAlert("Login Gagal", error.message);
      setLoading(false);
    }
  }

  async function register(data) {
    if (!firebaseReady || !auth || !db)
      return showAlert(
        "Firebase Belum Diatur",
        "Masukkan Firebase config Anda di App.jsx terlebih dahulu."
      );
    setLoading(true);
    try {
      let assignedRole = data.role;
      let status = "pending";
      if (data.email === "miftahul@igs.sch.id") {
        assignedRole = "admin";
        status = "approved";
      }
      const cred = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      await setDoc(doc(db, getPublicPath("users"), cred.user.uid), {
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: assignedRole,
        status,
        classes: [],
        createdAt: new Date().toISOString(),
      });
      if (status === "pending") {
        showAlert(
          "Pendaftaran Berhasil",
          "Akun Anda sedang menunggu persetujuan admin."
        );
        await signOut(auth);
      } else showAlert("Sukses", "Akun Admin berhasil dibuat.");
    } catch (error) {
      showAlert("Pendaftaran Gagal", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    if (!auth) return;
    setLoading(true);
    try {
      await signOut(auth);
    } finally {
      setLoading(false);
    }
  }

  function renderCurrentView() {
    const common = { state, showAlert, setLoading };
    if (currentView === "dashboard")
      return <Dashboard profile={state.userProfile} />;
    if (currentView === "print") return <PrintView {...common} />;
    if (currentView === "attendance") return <AttendanceView {...common} />;
    if (currentView === "grades") return <GradesView />;
    if (currentView === "leave") return <LeaveView />;
    if (currentView === "admin")
      return state.userProfile?.role === "admin" ? (
        <AdminView {...common} />
      ) : (
        <Dashboard profile={state.userProfile} />
      );
    return <Dashboard profile={state.userProfile} />;
  }

  return (
    <div className="app-shell">
      <ModalAlert alert={alert} onClose={closeAlert} />
      <LoadingOverlay show={loading} />
      {!authReady ? null : !firebaseReady ? (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="glass-panel max-w-xl p-8">
            <h1 className="text-2xl font-bold mb-2">
              Firebase belum dikonfigurasi
            </h1>
            <p className="opacity-80">
              Buka <b>App.jsx</b> lalu isi <b>FALLBACK_FIREBASE_CONFIG</b>{" "}
              dengan konfigurasi Firebase lama Anda. Saya sengaja membuat error
              ini terlihat jelas agar aplikasi tidak lagi buffering tanpa akhir.
            </p>
          </div>
        </div>
      ) : !state.userProfile ? (
        <AuthView onLogin={login} onRegister={register} loading={loading} />
      ) : (
        <MainLayout
          state={state}
          currentView={currentView}
          setCurrentView={setCurrentView}
          toggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          theme={theme}
          logout={logout}
        >
          {renderCurrentView()}
        </MainLayout>
      )}
    </div>
  );
}
