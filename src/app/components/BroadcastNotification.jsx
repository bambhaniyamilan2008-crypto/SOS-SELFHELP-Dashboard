"use client";
import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, ShieldAlert, Activity, Smartphone, 
  Send, History, Settings, LogOut, Navigation, Clock, Trash2 
} from 'lucide-react';

// FIREBASE & NOTIFICATION IMPORTS
import { 
  collection, query, onSnapshot, doc, 
  updateDoc, deleteDoc, orderBy, limit, getDocs 
} from 'firebase/firestore';
import { db } from './firebaseConfig'; 

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("monitor"); // Control Sidebar Tabs
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Push Notification States
  const [pushTitle, setPushTitle] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // 📡 1. REAL-TIME EMERGENCY MONITORING (GOD MODE SYNC)
  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("timestamp", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => console.error("Database Error:", err));
    return () => unsubscribe();
  }, []);

  // 🚀 2. GLOBAL DISPATCH ENGINE (EXPO PUSH API)
  const handleSendPush = async () => {
    if (!pushTitle || !pushMessage) {
      alert("Unauthorized: Please provide broadcast credentials (Title/Message).");
      return;
    }
    setIsSending(true);
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      let tokens = [];
      usersSnap.forEach(u => { if (u.data().expoPushToken) tokens.push(u.data().expoPushToken); });

      if (tokens.length === 0) throw new Error("No active device tokens.");

      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: tokens,
          sound: "default",
          title: pushTitle,
          body: pushMessage,
          priority: "high"
        }),
      });

      alert(`✅ Dispatch Successful: Target ${tokens.length} devices.`);
      setPushTitle(""); setPushMessage("");
    } catch (e) {
      alert(`Critical Failure: ${e.message}`);
    }
    setIsSending(false);
  };

  const activeCount = alerts.filter(a => a.status === 'active').length;

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans antialiased text-slate-900">
      
      {/* 🟢 SIDEBAR: COMMAND CENTER NAVIGATION */}
      <aside className="w-72 bg-slate-950 text-white flex flex-col fixed h-full shadow-2xl z-50">
        <div className="p-8 flex items-center gap-4 border-b border-slate-800/50">
          <div className="bg-red-600 p-2 rounded-lg shadow-lg">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight uppercase italic">SafeHelp OS</h1>
        </div>
        
        <nav className="flex-1 p-6 space-y-4">
          {/* TAB 1: LIVE MONITOR */}
          <button 
            onClick={() => setActiveTab("monitor")}
            className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold transition-all ${
              activeTab === "monitor" 
              ? "bg-red-600/10 border border-red-600/20 text-red-500 shadow-lg shadow-red-900/10" 
              : "text-slate-400 hover:bg-slate-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5" />
              <span>Live Monitor</span>
            </div>
            {activeCount > 0 && (
              <span className="bg-red-600 text-white text-[9px] px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
            )}
          </button>

          {/* TAB 2: PUSH BROADCAST (FIXED BELOW MONITOR) */}
          <button 
            onClick={() => setActiveTab("push")}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${
              activeTab === "push" 
              ? "bg-blue-600/10 border border-blue-600/20 text-blue-500 shadow-lg shadow-blue-900/10" 
              : "text-slate-400 hover:bg-slate-900"
            }`}
          >
            <Smartphone className="w-5 h-5" />
            <span>Push Broadcast</span>
          </button>

          <div className="pt-4 border-t border-slate-800/50 space-y-2">
            <button className="w-full flex items-center gap-3 p-4 text-slate-400 hover:bg-slate-900 rounded-2xl font-bold text-sm">
              <History className="w-5 h-5" />
              <span>Incident History</span>
            </button>
            <button className="w-full flex items-center gap-3 p-4 text-slate-400 hover:bg-slate-900 rounded-2xl font-bold text-sm">
              <Settings className="w-5 h-5" />
              <span>System Settings</span>
            </button>
          </div>
        </nav>

        <div className="p-6">
          <button className="w-full flex items-center justify-center gap-2 p-4 bg-slate-900 hover:bg-red-600/20 hover:text-red-500 transition-all rounded-2xl font-black text-[10px] uppercase tracking-[0.2em]">
            <LogOut className="w-4 h-4" /> Secure Logout
          </button>
        </div>
      </aside>

      {/* 🔵 DYNAMIC CONTENT AREA */}
      <main className="flex-1 ml-72 p-10">
        {activeTab === "monitor" ? (
          <section className="animate-in fade-in duration-500">
            <header className="mb-10 flex justify-between items-end">
              <div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter">Real-time Emergency Feed</h2>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div> Encrypted Database Sync Active
                </p>
              </div>
            </header>

            {loading ? (
              <div className="flex justify-center py-20 animate-pulse text-slate-300 font-black tracking-widest uppercase">Initializing Stream...</div>
            ) : (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className={`p-8 rounded-[2.5rem] border-2 transition-all duration-300 transform ${alert.status === 'active' ? 'bg-white border-red-600 shadow-2xl scale-100' : 'bg-slate-100 border-transparent opacity-60 grayscale'}`}>
                    <div className="flex justify-between items-start mb-6">
                      <div className={`p-4 rounded-3xl ${alert.status === 'active' ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-400'}`}>
                        <AlertCircle className="w-7 h-7" />
                      </div>
                      <button onClick={() => deleteDoc(doc(db, "alerts", alert.id))} className="text-slate-300 hover:text-red-600 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <h3 className="text-xl font-black uppercase italic truncate text-slate-900">{alert.userName || "SECURE USER"}</h3>
                    <div className="flex items-center gap-2 text-slate-400 mb-8">
                       <Clock className="w-3 h-3" />
                       <span className="text-[10px] font-bold uppercase tracking-widest">
                         {alert.timestamp?.seconds ? new Date(alert.timestamp.seconds * 1000).toLocaleString() : "Syncing..."}
                       </span>
                    </div>

                    {alert.status === 'active' ? (
                      <div className="space-y-3">
                        <button onClick={() => window.open(`https://www.google.com/maps?q=${alert.lat},${alert.lng}`, '_blank')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-lg">
                          <Navigation className="w-4 h-4" /> INITIATE TRACKING
                        </button>
                        <button onClick={() => updateDoc(doc(db, "alerts", alert.id), { status: "resolved" })} className="w-full py-4 border-2 border-slate-900 rounded-2xl font-black text-[10px] tracking-widest hover:bg-slate-900 hover:text-white transition-all">
                          RESOLVE INCIDENT
                        </button>
                      </div>
                    ) : (
                      <div className="py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px] text-center border border-emerald-100 uppercase tracking-widest">Incident Resolved</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          /* 🔵 BROADCAST INTERFACE */
          <section className="max-w-4xl animate-in slide-in-from-bottom duration-500">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-10">System Dispatch Portal</h2>
            <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 relative overflow-hidden">
               <div className="flex items-center gap-5 mb-12 relative z-10">
                  <div className="bg-blue-600 p-5 rounded-[1.5rem] text-white shadow-xl shadow-blue-500/30">
                    <Smartphone className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase italic">Broadcast Command</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Targeting All Registered SafeHelp Devices</p>
                  </div>
               </div>
               
               <div className="space-y-8 relative z-10">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Authorized Headline</label>
                   <input 
                    type="text" 
                    placeholder="e.g., SEVERE WEATHER ALERT" 
                    value={pushTitle}
                    onChange={(e) => setPushTitle(e.target.value)}
                    className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-lg focus:border-blue-600 outline-none transition-all" 
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Dispatch Message</label>
                   <textarea 
                    placeholder="Enter critical safety instructions or system updates..." 
                    value={pushMessage}
                    onChange={(e) => setPushMessage(e.target.value)}
                    className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold text-slate-600 h-40 focus:border-blue-600 outline-none transition-all resize-none" 
                   />
                 </div>
                 <button 
                  onClick={handleSendPush}
                  disabled={isSending}
                  className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-black tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/40 active:scale-95 transition-all disabled:opacity-50"
                 >
                   {isSending ? "DISPATCHING SIGNALS..." : "EXECUTE GLOBAL BROADCAST"}
                   {!isSending && <Send className="w-6 h-6" />}
                 </button>
               </div>
               
               {/* Decorative Element */}
               <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 opacity-5 pointer-events-none">
                 <Smartphone className="w-96 h-96 text-blue-600" />
               </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}