"use client";
import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  MapPin,
  ShieldAlert,
  Clock,
  Trash2,
  ExternalLink,
  Shield,
  Activity,
  MessageCircle,
  Smartphone,
  Send,
  Users,
  UserX,
  History,
  Radio,
  BellRing,
  Mic, 
} from "lucide-react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

export default function SOSAdminPanel() {
  const [activeTab, setActiveTab] = useState("monitor");
  const [monitorView, setMonitorView] = useState("live");

  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  const [stealthAudios, setStealthAudios] = useState([]);
  const [loadingAudios, setLoadingAudios] = useState(true);

  const [pushTitle, setPushTitle] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    const qAlerts = query(
      collection(db, "alerts"),
      orderBy("timestamp", "desc"),
      limit(100)
    );
    const unsubscribeAlerts = onSnapshot(qAlerts, (snapshot) => {
      setAlerts(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
      setLoadingAlerts(false);
    });

    const qAudio = query(
      collection(db, "stealth_audio_alerts"),
      orderBy("timestamp", "desc"),
      limit(50)
    );
    const unsubscribeAudio = onSnapshot(qAudio, (snapshot) => {
      setStealthAudios(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
      setLoadingAudios(false);
    });

    return () => {
      unsubscribeAlerts();
      unsubscribeAudio();
    };
  }, []);

  const markAsResolved = async (alertId) => {
    await updateDoc(doc(db, "alerts", alertId), {
      status: "resolved",
      resolvedAt: new Date().toISOString(),
    });
  };

  const deleteAlert = async (alertId) => {
    if (window.confirm("Permanently delete this alert record?")) {
      await deleteDoc(doc(db, "alerts", alertId));
    }
  };

  const deleteAudio = async (audioId) => {
    if (window.confirm("Permanently delete this secret audio intercept?")) {
      await deleteDoc(doc(db, "stealth_audio_alerts", audioId));
    }
  };

  const sendWhatsAppAlert = (alert) => {
    const mapLink = `https://maps.google.com/?q=${alert.lat},${alert.lng}`;
    const cleanName = alert.userName
      ? alert.userName.replace(/^.*\]\s*/, "")
      : "User";
    const message = `🚨 *URGENT SOS EMERGENCY* 🚨\n\n*Name:* ${cleanName}\n*Phone:* ${
      alert.phone || "N/A"
    }\n*Type:* ${alert.type || "General SOS"}\n\n📍 ${mapLink}`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const sendDirectMessage = async (alertData) => {
    const cleanName = alertData.userName
      ? alertData.userName.replace(/^.*\]\s*/, "")
      : "User";

    if (!window.confirm(`Send 'Help is on the way' notification to "${cleanName}"?`))
      return;

    try {
      const usersSnap = await getDocs(collection(db, "users"));
      let targetToken = null;

      usersSnap.forEach((u) => {
        const uData = u.data();
        if (
          (uData.name === cleanName || uData.phone === alertData.phone) &&
          (uData.pushToken || uData.expoPushToken)
        ) {
          targetToken = uData.pushToken || uData.expoPushToken;
        }
      });

      if (!targetToken) {
        alert("❌ Device Token not found!");
        return;
      }

      await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: [targetToken],
          sound: "default",
          title: "🚨 HELP IS ON THE WAY!",
          body: "We have received your emergency alert. Help is on the way. Stay safe!",
        }),
      });

      alert(`✅ Message sent to ${cleanName}!`);
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  const handleSendPush = async () => {
    if (!pushTitle || !pushMessage) {
      alert("⚠️ Enter Title and Message");
      return;
    }
    setIsSending(true);
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      let tokens = [];

      usersSnap.forEach((u) => {
        const t = u.data().pushToken || u.data().expoPushToken;
        if (t && String(t).includes("ExponentPushToken")) {
          tokens.push(t);
        }
      });

      await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: tokens,
          sound: "default",
          title: pushTitle,
          body: pushMessage,
        }),
      });

      alert("✅ Broadcast Sent!");
      setPushTitle("");
      setPushMessage("");
    } catch (e) {
      alert(`❌ Failed: ${e.message}`);
    }
    setIsSending(false);
  };

  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      setUsersList(
        snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    } catch (e) {
      console.error("Error fetching users", e);
    }
    setLoadingUsers(false);
  };

  const deleteUserRecord = async (userId, userName) => {
    if (
      window.confirm(
        `Are you sure you want to delete user: ${userName}? This cannot be undone.`
      )
    ) {
      await deleteDoc(doc(db, "users", userId));
      fetchAllUsers();
    }
  };

  const activeCount = alerts.filter((a) => a.status === "active").length;
  const displayedAlerts =
    monitorView === "live"
      ? alerts.filter(
          (a) =>
            !a.timestamp?.seconds ||
            new Date(a.timestamp.seconds * 1000).toDateString() ===
              new Date().toDateString()
        )
      : alerts.filter(
          (a) =>
            a.timestamp?.seconds &&
            new Date(a.timestamp.seconds * 1000).toDateString() !==
              new Date().toDateString()
        );

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900">
      
      <aside className="w-72 bg-slate-950 text-white flex flex-col fixed h-full shadow-2xl z-50">
        <div className="p-8 flex items-center gap-4 border-b border-slate-800/50">
          <div className="bg-red-600 p-2 rounded-lg">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black uppercase italic">SOS Admin</h1>
        </div>
        
        <nav className="flex-1 p-6 space-y-4">
          <button
            onClick={() => setActiveTab("monitor")}
            className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold transition-all ${
              activeTab === "monitor"
                ? "bg-red-600 text-white shadow-lg"
                : "text-slate-400 hover:bg-slate-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5" />
              <span>Monitor</span>
            </div>
            {activeCount > 0 && (
              <span className="bg-white text-red-600 text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
                LIVE
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("push")}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold ${
              activeTab === "push"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:bg-slate-900"
            }`}
          >
            <Smartphone className="w-5 h-5" />
            <span>Push</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("users");
              fetchAllUsers();
            }}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold ${
              activeTab === "users"
                ? "bg-purple-600 text-white"
                : "text-slate-400 hover:bg-slate-900"
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Users</span>
          </button>
        </nav>
      </aside>

      <main className="flex-1 ml-72 p-12">
        
        {activeTab === "monitor" && (
          <div className="animate-in fade-in duration-300">
            <header className="mb-10 flex justify-between items-end border-b border-slate-200 pb-8">
              <div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter">
                  Emergency Monitor
                </h2>
                <p className="text-slate-400 text-xs font-bold uppercase mt-2">
                  Active Surveillance Feed
                </p>
              </div>
              
              <div className="flex bg-slate-200/50 p-1 rounded-2xl">
                <button
                  onClick={() => setMonitorView("live")}
                  className={`px-6 py-3 rounded-xl font-black text-xs uppercase ${
                    monitorView === "live"
                      ? "bg-white text-red-600 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Today&apos;s SOS
                </button>
                <button
                  onClick={() => setMonitorView("history")}
                  className={`px-6 py-3 rounded-xl font-black text-xs uppercase ${
                    monitorView === "history"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  History
                </button>
              </div>
            </header>

            <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Victim Info
                    </th>
                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Time & Location
                    </th>
                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Emergency Actions
                    </th>
                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedAlerts.map((alert) => (
                    <tr
                      key={alert.id}
                      className={`hover:bg-slate-50 group ${
                        alert.status === "active" ? "bg-red-50/20" : ""
                      }`}
                    >
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${
                              alert.status === "active"
                                ? "bg-red-500 animate-pulse"
                                : "bg-slate-400"
                            }`}
                          >
                            <ShieldAlert className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 uppercase">
                              {alert.userName
                                ? alert.userName.replace(/^.*\]\s*/, "")
                                : "SECURE USER"}
                            </h4>
                            <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1">
                              {alert.phone || "No Phone"}
                            </p>
                            {alert.type && (
                              <div
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${
                                  alert.type.includes("Visually")
                                    ? "bg-red-100 text-red-700 border-red-200 animate-pulse"
                                    : alert.type.includes("Police")
                                    ? "bg-blue-100 text-blue-700 border-blue-200"
                                    : alert.type.includes("Medical")
                                    ? "bg-rose-100 text-rose-700 border-rose-200"
                                    : alert.type.includes("Fire")
                                    ? "bg-orange-100 text-orange-700 border-orange-200"
                                    : "bg-slate-100 text-slate-700 border-slate-200"
                                }`}
                              >
                                {alert.type}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="p-6">
                        <p className="text-[11px] font-bold text-slate-600 flex items-center gap-2 mb-1">
                          <Clock className="w-3 h-3" />
                          {alert.timestamp?.seconds
                            ? new Date(
                                alert.timestamp.seconds * 1000
                              ).toLocaleString()
                            : "Pending"}
                        </p>
                        <button
                          onClick={() =>
                            window.open(
                              `https://maps.google.com/?q=${alert.lat},${alert.lng}`,
                              "_blank"
                            )
                          }
                          className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md"
                        >
                          <MapPin className="w-3 h-3" /> Live Map
                        </button>
                      </td>
                      
                      <td className="p-6">
                        {alert.status === "active" ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => window.open("tel:100")}
                              className="p-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 hover:bg-blue-600 hover:text-white transition-all"
                            >
                              <Shield className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => window.open("tel:108")}
                              className="p-2.5 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 hover:bg-rose-600 hover:text-white transition-all"
                            >
                              <Activity className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => sendWhatsAppAlert(alert)}
                              className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all"
                            >
                              <MessageCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => sendDirectMessage(alert)}
                              className="flex items-center gap-2 px-3 py-2.5 bg-purple-50 text-purple-700 rounded-xl border border-purple-100 hover:bg-purple-600 hover:text-white transition-all"
                            >
                              <BellRing className="w-5 h-5" />
                              <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">
                                Notify
                              </span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 uppercase italic">
                            Locked
                          </span>
                        )}
                      </td>
                      
                      <td className="p-6 text-right flex items-center justify-end gap-3 h-full">
                        {alert.status === "active" ? (
                          <button
                            onClick={() => markAsResolved(alert.id)}
                            className="px-5 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 shadow-lg transition-all"
                          >
                            Mark Resolved
                          </button>
                        ) : (
                          <span className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase border border-emerald-100">
                            Resolved
                          </span>
                        )}
                        <button
                          onClick={() => deleteAlert(alert.id)}
                          className="p-2 text-slate-300 hover:text-red-600 transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {displayedAlerts.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-12 text-center">
                        <ShieldAlert className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="font-black text-slate-400 uppercase tracking-widest text-sm">
                          No alerts found
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 🔥 SECRET AUDIO ALERTS - QUOTES FIXED 🔥 */}
            <div className="mt-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header className="mb-6 flex justify-between items-end border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter text-red-600 flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Mic className="w-6 h-6 text-red-600 animate-pulse" />
                    </div>
                    Secret Audio Intercepts
                  </h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase mt-1 tracking-widest">
                    Live Stealth Recordings From Victim&apos;s Device
                  </p>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {stealthAudios.map((audio) => (
                  <div key={audio.id} className="bg-slate-950 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)]"></div>
                    
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="bg-red-500/20 text-red-500 text-[9px] px-2.5 py-1 rounded-md font-black uppercase tracking-widest border border-red-500/30">
                          Intercepted Audio
                        </span>
                        <p className="text-slate-400 text-[11px] font-bold flex items-center gap-1 mt-3 uppercase tracking-widest">
                          <Clock className="w-3 h-3" />
                          {audio.timestamp?.seconds
                            ? new Date(audio.timestamp.seconds * 1000).toLocaleString()
                            : "Just Now..."}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteAudio(audio.id)}
                        className="p-2 bg-white/5 rounded-xl text-slate-500 hover:bg-red-500/20 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <audio 
                      controls 
                      className="w-full h-10 outline-none filter invert sepia hue-rotate-[180deg] saturate-200 opacity-90 transition-opacity hover:opacity-100"
                    >
                      <source src={audio.audioUrl} type="audio/mp4" />
                      <source src={audio.audioUrl} type="audio/mpeg" />
                      Browser doesn&apos;t support audio.
                    </audio>
                  </div>
                ))}

                {stealthAudios.length === 0 && !loadingAudios && (
                  <div className="col-span-full p-10 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    <Mic className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest">
                      No secret intercepts recorded yet
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ======================= TAB 2: PUSH BROADCAST ======================= */}
        {activeTab === "push" && (
          <div className="animate-in fade-in slide-in-from-bottom duration-300 max-w-3xl">
            <header className="mb-12">
              <h2 className="text-4xl font-black uppercase italic tracking-tighter text-blue-600">
                Broadcast Center
              </h2>
              <p className="text-slate-400 text-xs font-bold uppercase mt-2">
                Global App Notifications
              </p>
            </header>
            
            <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-blue-50">
              <div className="flex items-center gap-5 mb-10">
                <div className="bg-blue-600 p-5 rounded-2xl text-white shadow-xl shadow-blue-500/30">
                  <Smartphone className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase italic">
                    New Dispatch
                  </h3>
                  <p className="text-xs font-bold text-slate-400 uppercase">
                    Send message to all apps
                  </p>
                </div>
              </div>
              
              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-4">
                    Headline
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. SYSTEM ALERT"
                    value={pushTitle}
                    onChange={(e) => setPushTitle(e.target.value)}
                    className="w-full p-6 bg-slate-50 border-2 rounded-3xl font-black text-lg focus:border-blue-600 outline-none"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-4">
                    Message Content
                  </label>
                  <textarea
                    placeholder="Enter instructions..."
                    value={pushMessage}
                    onChange={(e) => setPushMessage(e.target.value)}
                    className="w-full p-6 bg-slate-50 border-2 rounded-3xl font-bold h-40 focus:border-blue-600 outline-none resize-none"
                  />
                </div>
                
                <button
                  onClick={handleSendPush}
                  disabled={isSending}
                  className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl font-black tracking-[0.2em] flex items-center justify-center gap-4 shadow-xl active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSending ? "DISPATCHING..." : "FIRE BROADCAST"}
                  <Send className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB 3: USER DATABASE ======================= */}
        {activeTab === "users" && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
            <header className="mb-12 border-b border-slate-200 pb-8 flex justify-between items-end">
              <div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter text-purple-600">
                  User Database
                </h2>
                <p className="text-slate-400 text-xs font-bold uppercase mt-2">
                  Manage Registered Devices
                </p>
              </div>
              
              <div className="bg-white border-2 border-slate-100 px-6 py-3 rounded-2xl shadow-sm flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Total Users
                </span>
                <span className="text-2xl font-black text-purple-600">
                  {usersList.length.toString().padStart(2, "0")}
                </span>
              </div>
            </header>
            
            {loadingUsers ? (
              <div className="font-black text-slate-300 animate-pulse uppercase text-center mt-20">
                Loading Database...
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                          User Details
                        </th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                          Phone / Email
                        </th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                          Status
                        </th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {usersList.map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-slate-50 transition-colors group"
                        >
                          <td className="p-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-black text-lg uppercase shadow-inner">
                                {user.name ? user.name.charAt(0) : "U"}
                              </div>
                              <div>
                                <h4 className="font-black text-slate-900 uppercase">
                                  {user.name || "Unknown User"}
                                </h4>
                                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                                  ID: {user.id.slice(0, 8)}
                                </p>
                              </div>
                            </div>
                          </td>
                          
                          <td className="p-6 font-bold text-slate-600 text-sm">
                            {user.phone || user.email || "N/A"}
                          </td>
                          
                          <td className="p-6">
                            {user.pushToken || user.expoPushToken ? (
                              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                                App Installed
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                                No Device Token
                              </span>
                            )}
                          </td>
                          
                          <td className="p-6 text-right">
                            <button
                              onClick={() =>
                                deleteUserRecord(user.id, user.name || "Unknown")
                              }
                              className="p-3 bg-white border-2 border-slate-200 text-slate-400 rounded-xl hover:border-red-600 hover:text-red-600 hover:bg-red-50 transition-all"
                            >
                              <UserX className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      
                      {usersList.length === 0 && (
                        <tr>
                          <td
                            colSpan="4"
                            className="p-10 text-center font-black text-slate-300 uppercase tracking-widest"
                          >
                            No users found in database
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}