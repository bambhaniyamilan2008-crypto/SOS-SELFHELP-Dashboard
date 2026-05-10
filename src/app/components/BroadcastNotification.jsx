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
  const [activeTab, setActiveTab] = useState("monitor"); // ✅ Controls Visibility
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [pushTitle, setPushTitle] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // 📡 Real-time Sync
  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("timestamp", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSendPush = async () => {
    if (!pushTitle || !pushMessage) { alert("Please fill all fields!"); return; }
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
      alert("✅ Broadcast Dispatched!");
      setPushTitle(""); setPushMessage("");
    } catch (e) { alert("Failed to send!"); }
    setIsSending(false);
  };

  const activeCount = alerts.filter(a => a.status === 'active').length;

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans antialiased text-slate-900">
      
      {/* 🟢 SIDEBAR: Fixed Position */}
      <aside className="w-72 bg-slate-950 text-white flex flex-col fixed h-full z-50">
        <div className="p-8 flex items-center gap-4 border-b border-slate-800/50">
          <div className="bg-red-600 p-2 rounded-lg shadow-lg">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black uppercase italic">SafeHelp OS</h1>
        </div>
        
        <nav className="flex-1 p-6 space-y-3">
          {/* 1. MONITOR BUTTON */}
          <button 
            onClick={() => setActiveTab("monitor")}
            className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold transition-all ${
              activeTab === "monitor" ? "bg-red-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5" />
              <span>Live Monitor</span>
            </div>
            {activeCount > 0 && <span className="bg-white text-red-600 text-[10px] px-2 py-0.5 rounded-full font-black">LIVE</span>}
          </button>

          {/* 2. PUSH BROADCAST BUTTON (Directly Below) */}
          <button 
            onClick={() => setActiveTab("push")}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${
              activeTab === "push" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-900"
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

      {/* 🔵 MAIN CONTENT: Dynamic Rendering */}
      <main className="flex-1 ml-72 p-12">
        
        {/* CASE 1: MONITOR TAB ACTIVE */}
        {activeTab === "monitor" && (
          <div className="animate-in fade-in slide-in-from-left duration-300">
            <header className="mb-12">
              <h2 className="text-4xl font-black uppercase italic tracking-tighter">Emergency Monitor</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-2">Active Surveillance Stream</p>
            </header>

            {loading ? (
              <div className="text-slate-300 font-black animate-pulse">CONNECTING...</div>
            ) : (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className={`p-8 rounded-[2.5rem] border-2 shadow-sm transition-all ${alert.status === 'active' ? 'bg-white border-red-600 shadow-xl' : 'bg-slate-50 border-transparent opacity-50 grayscale'}`}>
                    <div className="flex justify-between mb-6">
                      <div className={`p-4 rounded-2xl ${alert.status === 'active' ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-400'}`}>
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <button onClick={() => deleteDoc(doc(db, "alerts", alert.id))} className="text-slate-300 hover:text-red-600"><Trash2 className="w-5 h-5" /></button>
                    </div>
                    <h3 className="text-xl font-black uppercase italic truncate">{alert.userName || "ANON"}</h3>
                    <p className="text-[10px] font-bold text-slate-400 mb-6 uppercase tracking-widest">{alert.timestamp?.seconds ? new Date(alert.timestamp.seconds * 1000).toLocaleTimeString() : "Pending"}</p>
                    {alert.status === 'active' ? (
                      <div className="space-y-3">
                        <button onClick={() => window.open(`https://www.google.com/maps?q=${alert.lat},${alert.lng}`, '_blank')} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] tracking-widest hover:bg-red-600">TRACK LOCATION</button>
                        <button onClick={() => updateDoc(doc(db, "alerts", alert.id), { status: "resolved" })} className="w-full py-4 border-2 border-slate-900 rounded-xl font-black text-[10px] tracking-widest hover:bg-slate-100">RESOLVE</button>
                      </div>
                    ) : (
                      <div className="py-3 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] text-center uppercase tracking-widest border border-emerald-100 italic">Situation Resolved</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CASE 2: PUSH BROADCAST TAB ACTIVE */}
        {activeTab === "push" && (
          <div className="animate-in fade-in slide-in-from-bottom duration-300 max-w-3xl">
            <header className="mb-12">
              <h2 className="text-4xl font-black uppercase italic tracking-tighter">Broadcast Center</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-2">Authorized Global Dispatch</p>
            </header>

            <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100">
               <div className="flex items-center gap-5 mb-10">
                  <div className="bg-blue-600 p-5 rounded-2xl text-white shadow-xl">
                    <Smartphone className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black uppercase italic">New Dispatch</h3>
               </div>
               <div className="space-y-8">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Headline</label>
                   <input type="text" placeholder="E.g. SYSTEM ALERT" value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} className="w-full p-6 bg-slate-50 border-2 rounded-3xl font-black text-lg focus:border-blue-600 outline-none" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Message Content</label>
                   <textarea placeholder="Enter official instructions..." value={pushMessage} onChange={(e) => setPushMessage(e.target.value)} className="w-full p-6 bg-slate-50 border-2 rounded-3xl font-bold h-40 focus:border-blue-600 outline-none resize-none" />
                 </div>
                 <button onClick={handleSendPush} disabled={isSending} className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl font-black tracking-[0.2em] flex items-center justify-center gap-4 shadow-xl active:scale-95 transition-all disabled:opacity-50">
                   {isSending ? "DISPATCHING..." : "SEND BROADCAST"} <Send className="w-6 h-6" />
                 </button>
               </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}