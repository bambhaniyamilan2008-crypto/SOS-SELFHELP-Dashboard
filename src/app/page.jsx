"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertCircle, MapPin, ShieldAlert, Clock, Trash2, 
  Activity, Smartphone, Send, Navigation, ExternalLink,
  Shield, MessageCircle, LogOut
} from 'lucide-react';

// FIREBASE IMPORTS
import { 
  collection, query, onSnapshot, doc, 
  updateDoc, deleteDoc, orderBy, limit, getDocs 
} from 'firebase/firestore';
import { db } from './firebaseConfig';

export default function SOSAdminPanel() {
  const [activeTab, setActiveTab] = useState("monitor"); // ✅ Pure Separation Logic
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Push Notification States
  const [pushTitle, setPushTitle] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // 📡 1. REAL-TIME EMERGENCY STREAM
  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("timestamp", "desc"), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 🚀 2. HIGH-ACCURACY PUSH DISPATCH
  const handleSendPushNotification = async () => {
    if (!pushTitle || !pushMessage) {
      alert("⚠️ Error: Please enter both Title and Message content.");
      return;
    }
    setIsSending(true);
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      let tokens = [];
      usersSnap.forEach(doc => { if (doc.data().expoPushToken) tokens.push(doc.data().expoPushToken); });

      if (tokens.length === 0) {
        alert("❌ No registered device tokens found.");
        setIsSending(false); return;
      }

      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: tokens, sound: "default", title: pushTitle, body: pushMessage }),
      });

      alert(`✅ Dispatch Successful: Target ${tokens.length} devices.`);
      setPushTitle(""); setPushMessage("");
    } catch (error) {
      alert("❌ Critical Error: Transmission failed.");
    }
    setIsSending(false);
  };

  const activeCount = alerts.filter(a => a.status === 'active').length;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans antialiased text-slate-900">
      
      {/* 🟢 SIDEBAR: FIXED COMMAND CENTER */}
      <aside className="w-72 bg-slate-950 text-white flex flex-col fixed h-full z-50 shadow-2xl">
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
              activeTab === "monitor" ? "bg-red-600 text-white shadow-xl shadow-red-900/20" : "text-slate-400 hover:bg-slate-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5" />
              <span>Live Monitor</span>
            </div>
            {activeCount > 0 && <span className="bg-white text-red-600 text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">LIVE</span>}
          </button>

          {/* TAB 2: PUSH BROADCAST */}
          <button 
            onClick={() => setActiveTab("push")}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${
              activeTab === "push" ? "bg-blue-600 text-white shadow-xl shadow-blue-900/20" : "text-slate-400 hover:bg-slate-900"
            }`}
          >
            <Smartphone className="w-5 h-5" />
            <span>Push Broadcast</span>
          </button>
        </nav>

        <div className="p-6">
          <button className="w-full flex items-center justify-center gap-2 p-4 text-slate-500 hover:text-red-500 font-black text-[10px] uppercase tracking-widest transition-all">
            <LogOut className="w-4 h-4" /> Secure Logout
          </button>
        </div>
      </aside>

      {/* 🔵 DYNAMIC CONTENT AREA */}
      <main className="flex-1 ml-72 p-10">
        
        {/* CASE 1: MONITOR INTERFACE */}
        {activeTab === "monitor" && (
          <div className="animate-in fade-in slide-in-from-left duration-500">
            <header className="mb-10 flex justify-between items-end border-b border-slate-200 pb-8">
              <div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter">Emergency Monitor</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Real-time Threat Surveillance</p>
              </div>
              <div className="bg-white border-2 border-slate-100 px-8 py-4 rounded-3xl shadow-sm flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Threats</span>
                <span className={`text-2xl font-black ${activeCount > 0 ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>{activeCount.toString().padStart(2, '0')}</span>
              </div>
            </header>

            {loading ? (
              <div className="flex justify-center py-20 font-black text-slate-300 animate-pulse uppercase tracking-[0.5em]">Syncing Encrypted Stream...</div>
            ) : (
              <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className={`p-8 rounded-[2.5rem] border-2 transition-all duration-300 ${alert.status === 'active' ? 'bg-white border-red-600 shadow-2xl' : 'bg-slate-50 border-transparent grayscale opacity-50'}`}>
                    <div className="flex justify-between mb-6">
                      <div className={`p-4 rounded-3xl ${alert.status === 'active' ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-400'}`}>
                        <ShieldAlert className="w-7 h-7" />
                      </div>
                      <button onClick={() => deleteDoc(doc(db, "alerts", alert.id))} className="text-slate-300 hover:text-red-600"><Trash2 className="w-5 h-5" /></button>
                    </div>
                    <h3 className="text-xl font-black uppercase truncate">{alert.userName || "SECURE USER"}</h3>
                    <p className="text-[11px] font-bold text-slate-400 mb-6 flex items-center gap-1 uppercase tracking-widest">
                      <Clock className="w-3 h-3" /> {alert.timestamp?.seconds ? new Date(alert.timestamp.seconds * 1000).toLocaleString() : "Pending"}
                    </p>
                    
                    {alert.status === 'active' ? (
                      <div className="space-y-4">
                        <button onClick={() => window.open(`https://maps.google.com/?q=${alert.lat},${alert.lng}`, '_blank')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs tracking-widest hover:bg-red-600 transition-all shadow-lg">INITIATE TRACKING</button>
                        <div className="flex gap-2">
                           <button onClick={() => updateDoc(doc(db, "alerts", alert.id), { status: "resolved" })} className="flex-1 py-4 border-2 border-slate-900 rounded-2xl font-black text-[10px] tracking-widest hover:bg-slate-900 hover:text-white transition-all">RESOLVE</button>
                           <button onClick={() => window.open(`https://wa.me/?text=🚨SOS: ${alert.userName} location: https://maps.google.com/?q=${alert.lat},${alert.lng}`, '_blank')} className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all"><MessageCircle className="w-6 h-6" /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-xs text-center border border-emerald-100 uppercase tracking-widest italic">Incident Secured</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CASE 2: BROADCAST DISPATCH INTERFACE */}
        {activeTab === "push" && (
          <div className="animate-in fade-in slide-in-from-bottom duration-500 max-w-4xl">
            <header className="mb-12">
              <h2 className="text-4xl font-black uppercase italic tracking-tighter text-blue-600">Global Dispatch Portal</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">System-wide Emergency Broadcasting</p>
            </header>

            <div className="bg-white p-12 rounded-[4rem] shadow-2xl border-b-8 border-blue-600 relative overflow-hidden">
               <div className="flex items-center gap-6 mb-12 relative z-10">
                  <div className="bg-blue-600 p-5 rounded-[2rem] text-white shadow-xl shadow-blue-500/30">
                    <Smartphone className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase italic">Execute Broadcast</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Targets All Registered Device Infrastructure</p>
                  </div>
               </div>
               
               <div className="space-y-8 relative z-10">
                 <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Authorized Headline</label>
                   <input type="text" placeholder="e.g. SEVERE WEATHER WARNING" value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-lg focus:border-blue-600 outline-none transition-all shadow-inner" />
                 </div>
                 <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Dispatch Message</label>
                   <textarea placeholder="Provide detailed safety instructions..." value={pushMessage} onChange={(e) => setPushMessage(e.target.value)} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold text-slate-600 h-44 focus:border-blue-600 outline-none transition-all resize-none shadow-inner" />
                 </div>
                 <button onClick={handleSendPushNotification} disabled={isSending} className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white rounded-[2.5rem] font-black tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl shadow-blue-500/40 active:scale-95 transition-all disabled:opacity-50">
                   {isSending ? "DISPATCHING SIGNALS..." : "EXECUTE BROADCAST"} <Send className="w-6 h-6" />
                 </button>
               </div>
               
               {/* Abstract Background Element */}
               <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 opacity-5 pointer-events-none">
                 <Smartphone className="w-96 h-96 text-blue-600" />
               </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}