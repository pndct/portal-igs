import React, { useState, useEffect, useCallback, useMemo } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCustomToken,
  signInAnonymously,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  deleteDoc,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import {
  LogOut,
  ClipboardCheck,
  Users,
  LayoutDashboard,
  Sparkles,
  FileText,
  Trash2,
  Clock,
  Check,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  Download,
  BookOpen,
  ChevronRight,
} from "lucide-react";

// --- KONFIGURASI FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDBHdt-fdToMgbZhsWo0N0XB7sY05qsbAY",
  authDomain: "igsattendance-65ada.firebaseapp.com",
  projectId: "igsattendance-65ada",
  storageBucket: "igsattendance-65ada.firebasestorage.app",
  messagingSenderId: "511035126689",
  appId: "1:511035126689:web:a59d5c6eb8decf68fdd1e0",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== "undefined" ? __app_id : "igs-portal-v1-0";

const JENJANG_DATA = {
  PAUD: [
    "PLAYGROUP KHADIJAH",
    "TK A SHOFIYAH",
    "TK A AISYAH",
    "TK B JUWAIRIYAH",
    "TK B SHOFITYAH",
  ],
  SD: [
    "1 AL QALAM",
    "1 AT TAUBAH",
    "2 AL ALAQ",
    "2 AT THORIQ",
    "3 AL MU'MINUN",
    "3 AL QADR",
    "4 AN NASHR",
    "4 AL KAUTSAR",
    "5 AL BALAD",
    "5 AL FATH",
    "6 AL BURUJ",
    "6 AN NUR",
  ],
  SMP: [
    "7 ABU RAIHAN AL BIRUNI",
    "7 ASYIFAH BINTI ABDULLAH",
    "8 AL BATTANI",
    "8 ZAINAB SYAHDA BINTI AHMAD",
    "9 ABU QASIM AL-ZAHRAWI",
    "9 FATIMAH AL-FIHRI",
  ],
};

const KEPALA_SEKOLAH = {
  PAUD: {
    nama: "MUAMMAR, S.Pd",
    jabatan: "Kepala PAUD Islamic Global Preschool",
  },
  SD: {
    nama: "SUKERTI, S.S., S.Pd.",
    jabatan: "Kepala SD Islamic Global School",
  },
  SMP: {
    nama: "IKA SUMARTI, S.Pd., M.Si.",
    jabatan: "Kepala SMP Islamic Global School",
  },
  SYSTEM: {
    nama: "SUKERTI, S.S., S.Pd.",
    jabatan: "Kepala SD Islamic Global School",
  },
};

const LOGO_URL = "https://i.imgur.com/dsAGVyl.png";
const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const UI = {
  CARD: "bg-white border border-slate-100 shadow-2xl rounded-[2.5rem]",
  INPUT:
    "w-full p-4 bg-[#F8FAFC] border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-bold text-indigo-950 outline-none text-sm placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed",
  BTN_PRIMARY:
    "w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg hover:bg-indigo-700 active:scale-[0.98] transition-all uppercase tracking-widest text-xs disabled:opacity-50",
};

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("login");
  const [toast, setToast] = useState(null);
  const [libsReady, setLibsReady] = useState(false);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const loadScript = (id, src) => {
      return new Promise((resolve) => {
        if (document.getElementById(id)) return resolve();
        const script = document.createElement("script");
        script.id = id;
        script.src = src;
        script.async = false;
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    };

    const init = async () => {
      await loadScript(
        "jspdf-main",
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
      );
      await loadScript(
        "jspdf-autotable",
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"
      );
      setLibsReady(true);
    };

    init();
  }, []);

  const fetchUserProfile = useCallback(
    async (u) => {
      try {
        const profileRef = doc(db, "artifacts", appId, "users", u.uid);
        const snap = await getDoc(profileRef);
        if (snap.exists()) {
          const data = snap.data();
          setUserData(data);
          if (["login", "register", "forgot"].includes(view)) {
            setView(data.role === "admin" ? "admin" : "dashboard");
          }
        }
      } catch (e) {
        console.error(e);
      }
    },
    [view]
  );

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== "undefined" &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error("Auth init error:", e);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        if (u.isAnonymous || u.emailVerified) {
          setUser(u);
          if (!u.isAnonymous) await fetchUserProfile(u);
        } else {
          setView("verify");
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUserProfile]);

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-indigo-600 uppercase tracking-widest text-[10px]">
          Memuat IGS Portal...
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-slate-900 font-sans">
      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-bold text-[10px] flex items-center gap-2 animate-in slide-in-from-top ${
            toast.type === "error"
              ? "bg-rose-600 text-white"
              : "bg-slate-900 text-white"
          }`}
        >
          {toast.type === "error" ? (
            <AlertCircle size={14} />
          ) : (
            <Sparkles size={14} className="text-yellow-400" />
          )}
          {toast.msg}
        </div>
      )}

      {!user || user.isAnonymous || !userData ? (
        <AuthScreen view={view} setView={setView} showToast={showToast} />
      ) : (
        <div className="flex flex-col lg:flex-row min-h-screen">
          <aside className="w-full lg:w-72 p-6 lg:h-screen lg:sticky lg:top-0 shrink-0">
            <div
              className={`${UI.CARD} h-full p-8 flex flex-col border-none bg-white shadow-sm`}
            >
              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm p-1">
                  <img
                    src={LOGO_URL}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="font-black text-indigo-950 text-xs leading-none tracking-tighter uppercase">
                    ABSENSI DIGITAL IGS
                  </h1>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">
                    v1.0 beta
                  </p>
                </div>
              </div>
              <nav className="space-y-2 flex-1">
                {userData.role === "admin" ? (
                  <>
                    <NavItem
                      active={view === "admin"}
                      icon={<Users size={18} />}
                      label="Database Siswa"
                      onClick={() => setView("admin")}
                    />
                    <NavItem
                      active={view === "report"}
                      icon={<FileText size={18} />}
                      label="Rekap Semua PDF"
                      onClick={() => setView("report")}
                    />
                  </>
                ) : (
                  <>
                    <NavItem
                      active={view === "dashboard"}
                      icon={<LayoutDashboard size={18} />}
                      label="Beranda"
                      onClick={() => setView("dashboard")}
                    />
                    <NavItem
                      active={view === "attendance"}
                      icon={<ClipboardCheck size={18} />}
                      label={
                        userData.role === "bidang"
                          ? "Absen Mapel"
                          : "Absensi Harian"
                      }
                      onClick={() => setView("attendance")}
                    />
                    <NavItem
                      active={view === "report"}
                      icon={<FileText size={18} />}
                      label="Laporan PDF"
                      onClick={() => setView("report")}
                    />
                  </>
                )}
              </nav>
              <div className="pt-6 border-t border-slate-100">
                <button
                  onClick={() => {
                    signOut(auth);
                    setView("login");
                  }}
                  className="w-full flex items-center justify-center gap-2 p-4 text-rose-500 font-black text-[10px] bg-rose-50 rounded-xl hover:bg-rose-100 transition-all uppercase"
                >
                  <LogOut size={14} /> Log Out
                </button>
              </div>
            </div>
          </aside>

          <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
            {view === "dashboard" && <Dashboard userData={userData} />}
            {view === "attendance" && (
              <AttendanceManager userData={userData} showToast={showToast} />
            )}
            {view === "report" && (
              <ReportPanel
                userData={userData}
                showToast={showToast}
                libsReady={libsReady}
              />
            )}
            {view === "admin" && <AdminDatabase showToast={showToast} />}
          </main>
        </div>
      )}
    </div>
  );
}

function NavItem({ active, icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-xl font-black text-[10px] transition-all uppercase ${
        active
          ? "bg-indigo-600 text-white shadow-lg"
          : "text-slate-400 hover:bg-slate-50"
      }`}
    >
      {icon} <span>{label}</span>
    </button>
  );
}

function AuthScreen({ view, setView, showToast }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "wali",
    jenjang: "SD",
    className: "1 AL QALAM",
    mapel: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (view === "register") {
      const defaultClass = JENJANG_DATA[form.jenjang]?.[0] || "";
      setForm((prev) => ({ ...prev, className: defaultClass }));
    }
  }, [form.jenjang, view]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (view === "login") {
        const res = await signInWithEmailAndPassword(
          auth,
          form.email,
          form.password
        );
        if (!res.user.emailVerified) {
          await signOut(auth);
          setView("verify");
        }
      } else if (view === "register") {
        const res = await createUserWithEmailAndPassword(
          auth,
          form.email,
          form.password
        );
        const profile = {
          name: form.name.toUpperCase(),
          email: form.email.toLowerCase(),
          role: form.role,
          jenjang: form.role === "admin" ? "SYSTEM" : form.jenjang,
          className:
            form.role === "wali"
              ? form.className
              : form.role === "admin"
              ? "ADMIN"
              : "ALL-ACCESS",
          mapel:
            form.role === "bidang"
              ? form.mapel.toUpperCase()
              : form.role === "admin"
              ? "ADMIN"
              : "Wali Kelas",
          uid: res.user.uid,
        };
        await setDoc(
          doc(db, "artifacts", appId, "users", res.user.uid),
          profile
        );
        await sendEmailVerification(res.user);
        await signOut(auth);
        setView("verify");
      } else if (view === "forgot") {
        await sendPasswordResetEmail(auth, form.email);
        showToast("Link reset password dikirim ke email.");
        setView("login");
      }
    } catch (err) {
      console.error(err);
      showToast("Gagal melakukan aksi autentikasi.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (view === "verify")
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8FAFC]">
        <div className={`${UI.CARD} w-full max-w-[460px] p-10 text-center`}>
          <Clock
            size={48}
            className="mx-auto text-amber-500 mb-6 animate-pulse"
          />
          <h2 className="text-2xl font-black text-indigo-950 uppercase mb-4">
            Verifikasi Email
          </h2>
          <p className="text-xs font-medium text-slate-500 mb-8">
            Link verifikasi telah dikirim ke email Anda.
          </p>
          <button onClick={() => setView("login")} className={UI.BTN_PRIMARY}>
            KEMBALI KE LOGIN
          </button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8FAFC]">
      <div className={`${UI.CARD} w-full max-w-[460px] p-10 lg:p-14`}>
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-white border border-slate-100 shadow-xl rounded-[2.5rem] mx-auto mb-6 flex items-center justify-center p-4">
            <img
              src={LOGO_URL}
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-2xl font-black text-indigo-950 uppercase">
            {view === "login"
              ? "Absensi Digital IGS"
              : view === "register"
              ? "Daftar Akun"
              : "Lupa Password"}
          </h2>
          <p
            className={`mt-2 ${
              view === "login"
                ? "font-poppins text-sm text-gray-500"
                : view === "register"
                ? "font-inter text-base text-gray-500"
                : "font-sans text-sm text-gray-500"
            }`}
          >
            {view === "login"
              ? "Silakan login untuk melanjutkan"
              : view === "register"
              ? ""
              : "Masukkan email untuk reset password"}
          </p>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          {view === "register" && (
            <div className="space-y-4 mb-4">
              <div className="p-1 bg-slate-100 rounded-2xl flex">
                {["wali", "bidang", "admin"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm({ ...form, role: r })}
                    className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${
                      form.role === r
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-400"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                placeholder="NAMA LENGKAP"
                className={UI.INPUT}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              {form.role !== "admin" && (
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className={UI.INPUT}
                    value={form.jenjang}
                    onChange={(e) =>
                      setForm({ ...form, jenjang: e.target.value })
                    }
                  >
                    {Object.keys(JENJANG_DATA).map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                  {form.role === "wali" ? (
                    <select
                      className={UI.INPUT}
                      value={form.className}
                      onChange={(e) =>
                        setForm({ ...form, className: e.target.value })
                      }
                    >
                      {(JENJANG_DATA[form.jenjang] || []).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      placeholder="MAPEL (Cth: PAI)"
                      className={UI.INPUT}
                      value={form.mapel}
                      onChange={(e) =>
                        setForm({ ...form, mapel: e.target.value })
                      }
                      required
                    />
                  )}
                </div>
              )}
            </div>
          )}
          <input
            type="email"
            placeholder="ALAMAT EMAIL"
            className={UI.INPUT}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          {view !== "forgot" && (
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="KATA SANDI"
                className={UI.INPUT}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}
          {view === "login" && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setView("forgot")}
                className="text-[9px] font-bold text-slate-400 uppercase hover:text-indigo-600 transition-colors"
              >
                Lupa Password?
              </button>
            </div>
          )}
          <button disabled={loading} type="submit" className={UI.BTN_PRIMARY}>
            {loading ? "PROSES..." : "LANJUTKAN"}
          </button>
        </form>
        <div className="mt-8 text-center space-y-2">
          <button
            type="button"
            onClick={() => setView(view === "login" ? "register" : "login")}
            className="text-[10px] font-black text-indigo-600 uppercase"
          >
            {view === "login"
              ? "Belum punya akun? Daftar"
              : "Sudah punya akun? Login"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ userData }) {
  return (
    <div className="space-y-6">
      <div className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">
            Sesi Aktif:{" "}
            {userData.role === "bidang"
              ? "Guru Bidang"
              : userData.role === "admin"
              ? "Administrator"
              : "Wali Kelas"}
          </p>
          <h2 className="text-3xl font-black uppercase">{userData?.name}</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="px-4 py-2 bg-white/10 rounded-xl text-[9px] font-black uppercase border border-white/20">
              {userData.role === "wali"
                ? `Kelas: ${userData.className}`
                : userData.role === "admin"
                ? "Super User"
                : `${userData.mapel} (${userData.jenjang})`}
            </span>
          </div>
        </div>
        <Sparkles
          size={120}
          className="absolute -bottom-10 -right-10 text-white opacity-10 rotate-12"
        />
      </div>
    </div>
  );
}

function AttendanceManager({ userData, showToast }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const isBidang = userData.role === "bidang";
  const isAdmin = userData.role === "admin";

  const [selectedClass, setSelectedClass] = useState(() => {
    if (
      isAdmin ||
      userData.className === "ALL-ACCESS" ||
      userData.className === "ADMIN"
    ) {
      return JENJANG_DATA["SD"]?.[0] || "";
    }
    return userData.className;
  });

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [showSiaFor, setShowSiaFor] = useState(null);

  const collectionName = isBidang ? "subject_attendance" : "attendance";
  const allAvailableClasses = useMemo(
    () => Object.values(JENJANG_DATA).flat(),
    []
  );

  useEffect(() => {
    if (!selectedClass) return;
    const qS = query(
      collection(db, "artifacts", appId, "students"),
      where("className", "==", selectedClass)
    );
    const unsubStudents = onSnapshot(
      qS,
      (s) => {
        setStudents(
          s.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      },
      (e) => showToast("Gagal memuat data siswa.", "error")
    );

    let qA = query(
      collection(db, "artifacts", appId, collectionName),
      where("date", "==", date),
      where("className", "==", selectedClass)
    );
    if (isBidang) qA = query(qA, where("mapel", "==", userData.mapel));

    const unsubAttend = onSnapshot(
      qA,
      (s) => {
        const data = {};
        s.docs.forEach((d) => {
          data[d.data().studentId] = d.data().status;
        });
        setAttendance(data);
      },
      (e) => console.error(e)
    );

    return () => {
      unsubStudents();
      unsubAttend();
    };
  }, [date, selectedClass, userData.mapel, collectionName, isBidang]);

  const setStatus = async (studentId, status) => {
    const docId = isBidang
      ? `${date}_${selectedClass}_${userData.mapel}_${studentId}`
      : `${date}_${selectedClass}_${studentId}`;
    try {
      if (status === null) {
        await deleteDoc(doc(db, "artifacts", appId, collectionName, docId));
      } else {
        const payload = {
          studentId,
          date,
          status,
          className: selectedClass,
          teacher: userData.name,
          timestamp: new Date().getTime(),
        };
        if (isBidang) payload.mapel = userData.mapel;
        await setDoc(
          doc(db, "artifacts", appId, collectionName, docId),
          payload
        );
      }
    } catch (e) {
      console.error(e);
    }
    setShowSiaFor(null);
  };

  return (
    <div className="space-y-6">
      <div
        className={`${UI.CARD} p-8 border-none flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50`}
      >
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div
            className={`w-12 h-12 bg-white ${
              isBidang ? "text-emerald-600" : "text-indigo-600"
            } rounded-2xl flex items-center justify-center shadow-sm`}
          >
            {isBidang ? <BookOpen size={24} /> : <ClipboardCheck size={24} />}
          </div>
          <div className="flex-1">
            <div className="font-black text-indigo-950 uppercase text-[10px] opacity-40 leading-none mb-1">
              {isBidang ? `ABSENSI MAPEL: ${userData.mapel}` : "ABSENSI HARIAN"}
            </div>
            {isBidang || isAdmin ? (
              <select
                className="bg-transparent font-black text-indigo-950 uppercase text-sm outline-none border-b-2 border-indigo-100 max-w-[200px]"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                {allAvailableClasses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <div className="font-black text-indigo-950 uppercase text-sm">
                {selectedClass}
              </div>
            )}
          </div>
        </div>
        <input
          type="date"
          className={UI.INPUT + " md:w-56 bg-white shadow-sm border-none"}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {students.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
            <Users size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">
              Belum ada siswa di kelas {selectedClass}
            </p>
          </div>
        )}
        {students.map((s) => (
          <div
            key={s.id}
            className={`${UI.CARD} p-6 border-none flex items-center justify-between`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl">
                {s.gender === "L" ? "👳" : "🧕"}
              </div>
              <div className="max-w-[150px]">
                <p className="font-black text-indigo-950 text-[10px] uppercase truncate">
                  {s.name}
                </p>
                <p
                  className={`text-[8px] font-bold uppercase ${
                    attendance[s.id] ? "text-indigo-600" : "text-slate-400"
                  }`}
                >
                  {attendance[s.id] || "BELUM ABSEN"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setStatus(s.id, attendance[s.id] === "H" ? null : "H")
                }
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  attendance[s.id] === "H"
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "bg-slate-100 text-slate-300"
                }`}
              >
                <Check size={18} />
              </button>
              <div className="relative">
                <button
                  onClick={() =>
                    setShowSiaFor(showSiaFor === s.id ? null : s.id)
                  }
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    ["S", "I", "A"].includes(attendance[s.id])
                      ? "bg-rose-500 text-white shadow-lg"
                      : "bg-slate-100 text-slate-300"
                  }`}
                >
                  <X size={18} />
                </button>
                {showSiaFor === s.id && (
                  <div className="absolute right-0 bottom-12 bg-white shadow-2xl rounded-2xl p-2 flex gap-2 border border-slate-100 z-50 animate-in slide-in-from-bottom-2">
                    {["S", "I", "A"].map((val) => (
                      <button
                        key={val}
                        onClick={() => setStatus(s.id, val)}
                        className="w-8 h-8 rounded-lg font-black text-[10px] bg-slate-50 text-slate-400 hover:bg-indigo-600 hover:text-white transition-all"
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminDatabase({ showToast }) {
  const [activeTab, setActiveTab] = useState("list");
  const [bulkData, setBulkData] = useState("");
  const [students, setStudents] = useState([]);
  const [filterJenjang, setFilterJenjang] = useState("ALL");
  const [filterClass, setFilterClass] = useState("ALL");
  const [importClass, setImportClass] = useState("1 AL QALAM");

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "artifacts", appId, "students"),
      (s) => {
        setStudents(
          s.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      },
      (e) => console.error(e)
    );
    return () => unsub();
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchJenjang =
        filterJenjang === "ALL" ||
        Object.keys(JENJANG_DATA).find((k) =>
          JENJANG_DATA[k].includes(s.className)
        ) === filterJenjang;
      const matchClass = filterClass === "ALL" || s.className === filterClass;
      return matchJenjang && matchClass;
    });
  }, [students, filterJenjang, filterClass]);

  const handleBulkImport = async () => {
    const batch = writeBatch(db);
    const lines = bulkData.split("\n");
    let count = 0;
    lines.forEach((line) => {
      const p = line.split("\t");
      if (p.length >= 3) {
        count++;
        batch.set(doc(collection(db, "artifacts", appId, "students")), {
          nis: p[0]?.trim() || "",
          nisn: p[1]?.trim() || "",
          name: p[2]?.trim().toUpperCase(),
          nickname: p[3]?.trim() || "",
          gender: p[4]?.trim().toUpperCase() === "L" ? "L" : "P",
          className: importClass,
        });
      }
    });
    if (count > 0) {
      await batch.commit();
      setBulkData("");
      showToast(`Import ${count} Siswa Berhasil!`);
      setActiveTab("list");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setActiveTab("list")}
          className={`px-6 py-4 rounded-xl font-black text-[10px] uppercase ${
            activeTab === "list"
              ? "bg-indigo-600 text-white shadow-lg"
              : "bg-white text-slate-400"
          }`}
        >
          Daftar Siswa
        </button>
        <button
          onClick={() => setActiveTab("import")}
          className={`px-6 py-4 rounded-xl font-black text-[10px] uppercase ${
            activeTab === "import"
              ? "bg-indigo-600 text-white shadow-lg"
              : "bg-white text-slate-400"
          }`}
        >
          Import Massal
        </button>
      </div>
      {activeTab === "list" ? (
        <div className="space-y-6">
          <div
            className={`${UI.CARD} p-6 border-none grid grid-cols-1 md:grid-cols-3 gap-4`}
          >
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">
                Filter Jenjang
              </label>
              <select
                className={UI.INPUT}
                value={filterJenjang}
                onChange={(e) => {
                  setFilterJenjang(e.target.value);
                  setFilterClass("ALL");
                }}
              >
                <option value="ALL">SEMUA JENJANG</option>
                {Object.keys(JENJANG_DATA).map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">
                Filter Kelas
              </label>
              <select
                className={UI.INPUT}
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
              >
                <option value="ALL">SEMUA KELAS</option>
                {(
                  JENJANG_DATA[filterJenjang] ||
                  Object.values(JENJANG_DATA).flat()
                ).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <div className="p-4 bg-indigo-50 rounded-2xl w-full text-center">
                <p className="text-[9px] font-black text-indigo-600 uppercase">
                  Total Terfilter
                </p>
                <p className="text-xl font-black text-indigo-950">
                  {filteredStudents.length} Siswa
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map((s) => (
              <div
                key={s.id}
                className={`${UI.CARD} p-6 flex justify-between items-center group border-none`}
              >
                <div>
                  <p className="font-black text-[10px] uppercase text-indigo-950">
                    {s.name}
                  </p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">
                    {s.className} • {s.gender}
                  </p>
                </div>
                <button
                  onClick={() =>
                    deleteDoc(doc(db, "artifacts", appId, "students", s.id))
                  }
                  className="text-rose-300 opacity-0 group-hover:opacity-100 hover:text-rose-600 transition-all p-2 bg-rose-50 rounded-lg"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={`${UI.CARD} p-10 border-none`}>
          <div className="mb-6">
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
              Kelas Tujuan Import
            </label>
            <select
              className={UI.INPUT}
              value={importClass}
              onChange={(e) => setImportClass(e.target.value)}
            >
              {Object.values(JENJANG_DATA)
                .flat()
                .map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
          </div>
          <textarea
            className={UI.INPUT + " h-64 mb-4 font-mono text-[10px]"}
            placeholder="NIS [TAB] NISN [TAB] NAMA LENGKAP [TAB] PANGGILAN [TAB] GENDER(L/P)"
            value={bulkData}
            onChange={(e) => setBulkData(e.target.value)}
          />
          <button onClick={handleBulkImport} className={UI.BTN_PRIMARY}>
            SIMPAN KE DATABASE
          </button>
        </div>
      )}
    </div>
  );
}

function ReportPanel({ userData, showToast, libsReady }) {
  const isAdmin = userData.role === "admin";
  const isBidang = userData.role === "bidang";
  const isWali = userData.role === "wali";

  // State dasar
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedTA, setSelectedTA] = useState("2025-2026");
  const [isGenerating, setIsGenerating] = useState(false);

  // State Khusus Admin
  const [adminReportType, setAdminReportType] = useState("wali"); // 'wali' atau 'bidang'
  const [availableSubjectList, setAvailableSubjectList] = useState([]); // List mapel yang sudah ada di DB
  const [adminSelectedSubject, setAdminSelectedSubject] = useState("");
  const [adminSelectedJenjang, setAdminSelectedJenjang] = useState("SD");

  // State Pilihan Kelas
  const [selectedClass, setSelectedClass] = useState(() => {
    if (isAdmin) return JENJANG_DATA["SD"][0];
    return userData.className;
  });

  // Efek Ambil Data Mapel Unik (Hanya untuk Admin)
  useEffect(() => {
    if (isAdmin && adminReportType === "bidang") {
      const unsub = onSnapshot(
        collection(db, "artifacts", appId, "users"),
        (snap) => {
          const subjects = new Set();
          snap.docs.forEach((d) => {
            const u = d.data();
            if (u.role === "bidang" && u.mapel) subjects.add(u.mapel);
          });
          const list = Array.from(subjects).sort();
          setAvailableSubjectList(list);
          if (list.length > 0 && !adminSelectedSubject)
            setAdminSelectedSubject(list[0]);
        }
      );
      return () => unsub();
    }
  }, [isAdmin, adminReportType]);

  // Daftar Kelas yang Tersedia Berdasarkan Aturan Baru
  const classesForDropdown = useMemo(() => {
    if (isWali) return [userData.className];
    if (isBidang) return JENJANG_DATA[userData.jenjang] || [];
    if (isAdmin) return JENJANG_DATA[adminSelectedJenjang] || [];
    return [];
  }, [userData, isWali, isBidang, isAdmin, adminSelectedJenjang]);

  // Fungsi PDF Generator (Inti Tetap Sama agar stabil)
  const getBase64Image = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.setAttribute("crossOrigin", "anonymous");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const generatePDF = async () => {
    const jspdfLib = window.jspdf || (window.window && window.window.jspdf);
    if (!jspdfLib) {
      showToast("Gagal memuat pustaka PDF.", "error");
      return;
    }

    setIsGenerating(true);
    try {
      const { jsPDF } = jspdfLib;
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [215, 330],
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const sq = query(
        collection(db, "artifacts", appId, "students"),
        where("className", "==", selectedClass)
      );
      const sSnap = await getDocs(sq);
      const studentList = sSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (studentList.length === 0) {
        showToast("Daftar siswa kosong untuk kelas " + selectedClass, "error");
        setIsGenerating(false);
        return;
      }

      const yearBase = parseInt(selectedTA.split("-")[0]);
      const actualYear = selectedMonth >= 6 ? yearBase : yearBase + 1;
      const daysInMonth = new Date(actualYear, selectedMonth + 1, 0).getDate();
      const semester = selectedMonth >= 6 ? "GANJIL" : "GENAP";
      const datePrefix = `${actualYear}-${String(selectedMonth + 1).padStart(
        2,
        "0"
      )}`;

      // Logika Penentuan Tipe Laporan & Mapel
      const isReportBidang = isAdmin ? adminReportType === "bidang" : isBidang;
      const displaySubject = isReportBidang
        ? isAdmin
          ? adminSelectedSubject
          : userData.mapel
        : "Wali Kelas";
      const collName = isReportBidang ? "subject_attendance" : "attendance";

      let aq = query(
        collection(db, "artifacts", appId, collName),
        where("className", "==", selectedClass)
      );
      if (isReportBidang) aq = query(aq, where("mapel", "==", displaySubject));

      const aSnap = await getDocs(aq);
      const attMap = {};
      aSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.date.startsWith(datePrefix)) {
          const dayNum = parseInt(data.date.split("-")[2]);
          if (!attMap[data.studentId]) attMap[data.studentId] = {};
          attMap[data.studentId][dayNum] = data.status;
        }
      });

      // Layouting PDF
      let startY = 10;
      try {
        const logoBase = await getBase64Image(LOGO_URL);
        doc.addImage(logoBase, "PNG", (pageWidth - 14) / 2, startY, 14, 14);
        startY += 16;
      } catch (err) {}

      let currentJenjang = "SD";
      if (JENJANG_DATA["PAUD"].includes(selectedClass)) currentJenjang = "PAUD";
      if (JENJANG_DATA["SMP"].includes(selectedClass)) currentJenjang = "SMP";

      const schoolHeader =
        currentJenjang === "PAUD"
          ? "PAUD ISLAMIC GLOBAL PRESCHOOL"
          : currentJenjang === "SMP"
          ? "SMP ISLAMIC GLOBAL SCHOOL"
          : "SD ISLAMIC GLOBAL SCHOOL";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(schoolHeader, pageWidth / 2, startY + 3, { align: "center" });

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.text(
        "Jl. Rambai No. 9 RT 7 Kelurahan Gunung Samarinda Baru, Balikpapan",
        pageWidth / 2,
        startY + 7.5,
        { align: "center" }
      );
      doc.text(
        "Email: admin@islamicglobalschool.sch.id | Website: www.islamicglobalschool.sch.id",
        pageWidth / 2,
        startY + 11,
        { align: "center" }
      );
      doc.setLineWidth(0.4);
      doc.line(15, startY + 14, pageWidth - 15, startY + 14);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("DAFTAR HADIR SISWA", pageWidth / 2, startY + 20, {
        align: "center",
      });
      doc.text(`TAHUN AJARAN ${selectedTA}`, pageWidth / 2, startY + 24, {
        align: "center",
      });

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Bidang Studi  : ${displaySubject}`, 15, startY + 30);
      doc.text(`Semester        : ${semester}`, 15, startY + 34);
      doc.text(`Kelas               : ${selectedClass}`, 15, startY + 38);
      doc.text(
        `Bulan : ${MONTHS[selectedMonth].toUpperCase()} ${actualYear}`,
        pageWidth - 15,
        startY + 30,
        { align: "right" }
      );

      const head1 = [
        { content: "No", rowSpan: 2 },
        { content: "NIS", rowSpan: 2 },
        { content: "NISN", rowSpan: 2 },
        { content: "Nama Siswa", rowSpan: 2 },
        { content: "Panggilan", rowSpan: 2 },
        { content: "L/P", rowSpan: 2 },
        { content: `Tanggal`, colSpan: daysInMonth },
        { content: "Jumlah", colSpan: 3 },
      ];
      const head2 = [
        ...Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString()),
        "S",
        "I",
        "A",
      ];

      const body = studentList.map((s, idx) => {
        const sAtt = attMap[s.id] || {};
        const daily = Array.from({ length: daysInMonth }, (_, i) => {
          const v = sAtt[i + 1];
          return v === "H" ? "v" : v || "";
        });
        const c = { S: 0, I: 0, A: 0 };
        Object.values(sAtt).forEach((v) => {
          if (c[v] !== undefined) c[v]++;
        });
        return [
          idx + 1,
          s.nis || "-",
          s.nisn || "-",
          s.name,
          s.nickname || "-",
          s.gender,
          ...daily,
          c.S || "",
          c.I || "",
          c.A || "",
        ];
      });

      doc.autoTable({
        head: [head1, head2],
        body: body,
        startY: startY + 43,
        theme: "grid",
        styles: {
          fontSize: 4.5,
          cellPadding: 0.7,
          halign: "center",
          textColor: 0,
          lineColor: 0,
          lineWidth: 0.05,
        },
        headStyles: {
          fillColor: [255, 255, 255],
          fontStyle: "bold",
          textColor: 0,
        },
        columnStyles: {
          3: { halign: "left", cellWidth: 42 },
          4: { halign: "left", cellWidth: 15 },
        },
        didParseCell: function (data) {
          if (
            data.section === "body" &&
            data.column.index >= 6 &&
            data.column.index < 6 + daysInMonth
          ) {
            const dayNum = data.column.index - 5;
            const d = new Date(actualYear, selectedMonth, dayNum);
            if (d.getDay() === 0 || d.getDay() === 6)
              data.cell.styles.fillColor = [220, 220, 220];
          }
        },
      });

      let footerY = doc.lastAutoTable.finalY + 10;
      if (footerY + 35 > pageHeight) {
        doc.addPage();
        footerY = 20;
      }
      const ttdInfo =
        KEPALA_SEKOLAH[currentJenjang] || KEPALA_SEKOLAH["SYSTEM"];
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.text("Mengetahui,", 40, footerY);
      doc.text(ttdInfo.jabatan, 40, footerY + 5);
      doc.setFont("helvetica", "bold");
      doc.text(ttdInfo.nama, 40, footerY + 28);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Balikpapan, ${daysInMonth} ${MONTHS[selectedMonth]} ${actualYear}`,
        pageWidth - 90,
        footerY
      );
      doc.text(
        `Guru ${isReportBidang ? "Bidang" : "Kelas"},`,
        pageWidth - 90,
        footerY + 5
      );
      doc.setFont("helvetica", "bold");
      doc.text(
        isAdmin ? "ADMINISTRATOR" : userData.name,
        pageWidth - 90,
        footerY + 28
      );

      doc.save(
        `REKAP_${displaySubject}_${selectedClass}_${MONTHS[
          selectedMonth
        ].toUpperCase()}.pdf`
      );
      showToast("Download Berhasil!");
    } catch (e) {
      showToast("Gagal generate PDF", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`${UI.CARD} p-10 max-w-2xl mx-auto border-none`}>
      <div className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-indigo-100">
          <FileText size={28} />
        </div>
        <div>
          <h3 className="font-black text-indigo-950 uppercase text-lg">
            Laporan PDF
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Mode:{" "}
            {isAdmin ? "ADMINISTRATOR" : isWali ? "WALI KELAS" : "GURU BIDANG"}
          </p>
        </div>
      </div>

      <div className="space-y-5 mb-10">
        {/* --- KHUSUS ADMIN: FILTER TIPE GURU & MAPEL --- */}
        {isAdmin && (
          <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4 mb-6">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">
                1. Pilih Tipe Guru
              </label>
              <div className="flex p-1 bg-white rounded-xl border border-slate-200">
                <button
                  onClick={() => setAdminReportType("wali")}
                  className={`flex-1 py-3 rounded-lg text-[9px] font-black uppercase transition-all ${
                    adminReportType === "wali"
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-slate-400"
                  }`}
                >
                  Wali Kelas
                </button>
                <button
                  onClick={() => setAdminReportType("bidang")}
                  className={`flex-1 py-3 rounded-lg text-[9px] font-black uppercase transition-all ${
                    adminReportType === "bidang"
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-slate-400"
                  }`}
                >
                  Guru Bidang
                </button>
              </div>
            </div>

            {adminReportType === "bidang" && (
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">
                  2. Pilih Bidang Studi (Terdaftar)
                </label>
                <select
                  className={UI.INPUT + " bg-white"}
                  value={adminSelectedSubject}
                  onChange={(e) => setAdminSelectedSubject(e.target.value)}
                >
                  {availableSubjectList.length === 0 ? (
                    <option disabled>BELUM ADA DATA BIDANG</option>
                  ) : (
                    availableSubjectList.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">
                {adminReportType === "bidang" ? "3" : "2"}. Pilih Jenjang
                Sekolah
              </label>
              <select
                className={UI.INPUT + " bg-white"}
                value={adminSelectedJenjang}
                onChange={(e) => {
                  setAdminSelectedJenjang(e.target.value);
                  setSelectedClass(JENJANG_DATA[e.target.value][0]);
                }}
              >
                {Object.keys(JENJANG_DATA).map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* --- INPUTAN UMUM (DENGAN LOGIKA PERAN) --- */}

        {/* Step: Pilih Kelas */}
        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-400 uppercase">
            {isAdmin
              ? adminReportType === "bidang"
                ? "4. Pilih Kelas"
                : "3. Pilih Kelas"
              : "1. Pilih Kelas"}
          </label>
          <select
            className={UI.INPUT}
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={isWali} // Wali kelas tidak bisa ganti kelas
          >
            {classesForDropdown.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {isWali && (
            <p className="text-[8px] font-bold text-indigo-500 uppercase px-2 italic">
              * Terkunci sesuai wali kelas
            </p>
          )}
        </div>

        {/* Step: Pilih Bulan */}
        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-400 uppercase">
            {isAdmin
              ? adminReportType === "bidang"
                ? "5. Pilih Bulan"
                : "4. Pilih Bulan"
              : "2. Pilih Bulan"}
          </label>
          <select
            className={UI.INPUT}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Step: Pilih TA */}
        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-400 uppercase">
            {isAdmin
              ? adminReportType === "bidang"
                ? "6. Pilih Tahun Ajaran"
                : "5. Pilih Tahun Ajaran"
              : "3. Pilih Tahun Ajaran"}
          </label>
          <select
            className={UI.INPUT}
            value={selectedTA}
            onChange={(e) => setSelectedTA(e.target.value)}
          >
            <option value="2025-2026">2025-2026</option>
            <option value="2026-2027">2026-2027</option>
            <option value="2027-2028">2027-2028</option>
          </select>
        </div>
      </div>

      <button
        onClick={generatePDF}
        disabled={
          isGenerating ||
          !libsReady ||
          !selectedClass ||
          (isAdmin && adminReportType === "bidang" && !adminSelectedSubject)
        }
        className={
          UI.BTN_PRIMARY +
          " py-6 text-sm flex items-center justify-center gap-3 disabled:bg-slate-100 disabled:text-slate-300"
        }
      >
        {isGenerating ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <Download size={20} />
        )}
        {isGenerating ? "MENGUNDUH..." : "download pdf"}
      </button>

      {/* Info Tambahan */}
      <div className="mt-8 flex gap-4 p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
        <Sparkles size={18} className="text-indigo-400 shrink-0" />
        <div>
          <p className="text-[9px] font-black text-indigo-950 uppercase mb-1">
            Keterangan Laporan
          </p>
          <p className="text-[9px] font-medium text-indigo-600 uppercase leading-relaxed">
            Laporan akan digenerate dengan ukuran kertas F4 (landscape). Nama
            guru penandatangan akan otomatis menyesuaikan dengan akun yang login
            atau pilihan Admin.
          </p>
        </div>
      </div>
    </div>
  );
}
