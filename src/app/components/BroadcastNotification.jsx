"use client";
import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, ShieldAlert, Activity, Smartphone, 
  Send, History, Settings, LogOut, Navigation, Clock, Trash2 
} from 'lucide-react';
import { 
  collection, query, onSnapshot, doc, 
  updateDoc, deleteDoc, orderBy, limit, getDocs 
} from 'firebase/firestore';
import { db } from './firebaseConfig'; 

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("monitor"); // ✅ Pure Separation Logic
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [pushTitle, setPushTitle] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // 📡 Real-time Firebase Sync
  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("timestamp", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 🚀 Push Notification Engine
  const handleSendPush = async () => {
    if (!pushTitle || !pushMessage) {
      alert("Unauthorized: Please provide both Title and Message content!");
      return;
    }
    setIsSending(true);
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      let tokens = [];
      usersSnap.forEach(u => { if (u.data().expoPushToken) tokens.push(u.data().expoPushToken); });

      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: tokens, sound: "default", title: pushTitle, body: pushMessage }),
      });

      alert(`✅ Dispatch Successful! Sent to ${tokens.length} devices.`);
      setPushTitle(""); setPushMessage("");
    } catch (e) { alert("Critical Error: Transmission failed."); }
    setIsSending(false);
  };

  const activeCount = alerts.filter(a => a.status === 'active').length;

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans antialiased text-slate-900">
      
      {/* 🟢 SIDEBAR: Fixed Control Center */}
      <aside className="w-72 bg-slate-950 text-white flex flex-col fixed h-full z-50">
        <div className="p-8 flex items-center gap-4 border-b border-slate-800/50">
          <div className="bg-red-600 p-2 rounded-lg shadow-lg">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black uppercase italic tracking-tight">SafeHelp OS</h1>
        </div>
        
        <nav className="flex-1 p-6 space-y-3">
          {/* 1. MONITOR TAB */}
          <button 
            onClick={() => setActiveTab("monitor")}
            className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold transition-all ${
              activeTab === "monitor" ? "bg-red-600 text-white shadow-lg shadow-red-900/20" : "text-slate-400 hover:bg-slate-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5" />
              <span>Live Monitor</span>
            </div>
            {activeCount > 0 && <span className="bg-white text-red-600 text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse text-xs">LIVE</span>}
          </button>

          {/* 2. PUSH TAB (Directly Below Monitor) */}
          <button 
            onClick={() => setActiveTab("push")}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${
              activeTab === "push" ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-slate-400 hover:bg-slate-900"
            }`}
          >
            <Smartphone className="w-5 h-5" />
            <span>Push Broadcast</span>
          </button>
        </nav>

        <div className="p-6 border-t border-slate-800/50">
          <button className="w-full flex items-center justify-center gap-2 p-4 text-slate-500 hover:text-red-500 transition-all font-black text-[10px] uppercase tracking-widest">
            <LogOut className="w-4 h-4" /> Secure Logout
          </button>
        </div>
      </aside>

      {/* 🔵 MAIN CONTENT AREA */}
      <main className="flex-1 ml-72 p-12">
        
        {/* TAB 1: EMERGENCY MONITOR */}
        {activeTab === "monitor" && (
          <div className="animate-in fade-in slide-in-from-left duration-500">
            <header className="mb-12">
              <h2 className="text-4xl font-black uppercase italic tracking-tighter">Emergency Monitor</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Active Surveillance Feed
              </p>
            </header>

            {loading ? (
              <div className="text-slate-300 font-black tracking-widest animate-pulse">INITIALIZING SECURE STREAM...</div>
            ) : (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className={`p-8 rounded-[2.5rem] border-2 shadow-sm transition-all ${alert.status === 'active' ? 'bg-white border-red-600 shadow-2xl scale-100' : 'bg-slate-100 border-transparent opacity-50 grayscale scale-95'}`}>
                    <div className="flex justify-between mb-6">
                      <div className={`p-4 rounded-2xl ${alert.status === 'active' ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-400'}`}>
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <button onClick={() => deleteDoc(doc(db, "alerts", alert.id))} className="text-slate-300 hover:text-red-600 transition-colors"><Trash2 className="w-5 h-5" /></button>
                    </div>
                    <h3 className="text-xl font-black uppercase italic truncate">{alert.userName || "SECURE USER"}</h3>
                    <p className="text-[10px] font-bold text-slate-400 mb-6 uppercase tracking-widest">{alert.timestamp?.seconds ? new Date(alert.timestamp.seconds * 1000).toLocaleString() : "Syncing..."}</p>
                    
                    {alert.status === 'active' ? (
                      <div className="space-y-3">
                        <button onClick={() => window.open(`https://www.google.com/maps?q=${alert.lat},${alert.lng}`, '_blank')} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] tracking-widest hover:bg-red-600 shadow-lg">TRACK LOCATION</button>
                        <button onClick={() => updateDoc(doc(db, "alerts", alert.id), { status: "resolved" })} className="w-full py-4 border-2 border-slate-900 rounded-xl font-black text-[10px] tracking-widest hover:bg-slate-100">RESOLVE THREAT</button>
                      </div>
                    ) : (
                      <div className="py-4 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] text-center uppercase tracking-widest border border-emerald-100 italic">Situation Resolved</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PUSH DISPATCH PORTAL */}
        {activeTab === "push" && (
          <div className="animate-in fade-in slide-in-from-bottom duration-500 max-w-3xl">
            <header className="mb-12">
              <h2 className="text-4xl font-black uppercase italic tracking-tighter text-blue-600">Dispatch Portal</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-2">Authorized Global Broadcast</p>
            </header>

            <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 relative overflow-hidden">
               <div className="flex items-center gap-5 mb-12 relative z-10">
                  <div className="bg-blue-600 p-5 rounded-2xl text-white shadow-xl shadow-blue-500/30">
                    <Smartphone className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase italic">New Broadcast</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase">Send message to all apps</p>
                  </div>
               </div>
               
               <div className="space-y-8 relative z-10">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Headline</label>
                   <input type="text" placeholder="E.g. EMERGENCY WARNING" value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-lg focus:border-blue-600 outline-none transition-all" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Dispatch Message</label>
                   <textarea placeholder="Enter official instructions for users..." value={pushMessage} onChange={(e) => setPushMessage(e.target.value)} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold text-slate-600 h-40 focus:border-blue-600 outline-none resize-none transition-all" />
                 </div>
                 <button onClick={handleSendPush} disabled={isSending} className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl font-black tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl shadow-blue-500/40 active:scale-95 transition-all disabled:opacity-50">
                   {isSending ? "DISPATCHING SIGNALS..." : "FIRE GLOBAL ALERT"} <Send className="w-6 h-6" />
                 </button>
               </div>
               
               <div className="absolute top-0 right-0 opacity-5 pointer-events-none">
                 <Smartphone className="w-80 h-80 text-blue-600 translate-x-10 -translate-y-10" />
               </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}