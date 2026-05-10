"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertCircle, MapPin, ShieldAlert, Clock, Trash2, 
  Activity, Smartphone, Send, Navigation, Info
} from 'lucide-react';
import { 
  collection, query, onSnapshot, doc, 
  updateDoc, deleteDoc, orderBy, limit, getDocs 
} from 'firebase/firestore';
import { db } from './firebaseConfig';

export default function BroadcastNotification() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pushTitle, setPushTitle] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // 📡 REAL-TIME SYNC WITH FIREBASE
  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("timestamp", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => console.error("Firebase Sync Error", err));
    return () => unsubscribe();
  }, []);

  // 🚀 PUSH NOTIFICATION ENGINE
  const handleSendPushNotification = async () => {
    if (!pushTitle || !pushMessage) {
      alert("Bhai, Title aur Message dono bharna zaroori hai!");
      return;
    }
    setIsSending(true);
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      let tokens = [];
      usersSnap.forEach(doc => {
        if (doc.data().expoPushToken) tokens.push(doc.data().expoPushToken);
      });

      if (tokens.length === 0) {
        alert("Database mein koi Push Token nahi mila!");
        setIsSending(false); return;
      }

      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: tokens,
          sound: "default",
          title: pushTitle,
          body: pushMessage,
          data: { type: "broadcast" }
        }),
      });

      alert(`✅ Success! ${tokens.length} phones par notification bhej diya.`);
      setPushTitle(""); setPushMessage("");
    } catch (e) {
      alert("Error: Notification nahi gayi.");
    }
    setIsSending(false);
  };

  const activeCount = alerts.filter(a => a.status === 'active').length;

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col font-sans text-slate-900">
      
      {/* 🟢 SECTION 1: HEADER & LIVE STATUS */}
      <div className="bg-white border-b-2 border-slate-200 p-6 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-3 rounded-2xl shadow-lg shadow-red-200">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter">SafeHelp Command</h1>
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-widest">Global Monitor Active</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
             <div className="bg-slate-900 px-6 py-3 rounded-2xl flex flex-col items-end justify-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Emergency Alerts</span>
                <span className={`text-2xl font-black ${activeCount > 0 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  {activeCount.toString().padStart(2, '0')}
                </span>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full p-6 md:p-10 flex flex-col gap-12">
        
        {/* 🚨 SECTION 2: LIVE EMERGENCY MONITOR (YE AB UPAR HAI) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <Activity className="w-6 h-6 text-red-600" />
               <h2 className="text-2xl font-black uppercase italic">Live Emergency Feed</h2>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase bg-white px-4 py-1 rounded-full border">
              Real-time Sync Enabled
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center flex flex-col items-center gap-4">
               <div className="w-12 h-12 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></div>
               <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Accessing Secure Database...</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {alerts.length === 0 && (
                <div className="col-span-full bg-white p-10 rounded-[2.5rem] text-center border-2 border-dashed border-slate-200">
                   <p className="font-bold text-slate-400 uppercase tracking-widest italic">No emergency alerts found in database</p>
                </div>
              )}
              {alerts.map((alert) => (
                <div key={alert.id} className={`p-8 rounded-[2.5rem] border-2 transition-all duration-300 transform ${alert.status === 'active' ? 'bg-white border-red-600 shadow-2xl scale-100' : 'bg-slate-200/50 border-transparent opacity-60 scale-95 grayscale'}`}>
                   <div className="flex justify-between items-start mb-6">
                      <div className={`p-4 rounded-3xl ${alert.status === 'active' ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-400 text-slate-100'}`}>
                        <AlertCircle className="w-7 h-7" />
                      </div>
                      <button onClick={() => deleteDoc(doc(db, "alerts", alert.id))} className="text-slate-300 hover:text-red-600 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                   </div>
                   
                   <h3 className="text-xl font-black uppercase italic truncate">{alert.userName || "SECURE USER"}</h3>
                   <div className="flex items-center gap-2 text-slate-400 mb-6">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        {alert.timestamp?.seconds ? new Date(alert.timestamp.seconds * 1000).toLocaleTimeString() : "Pending"}
                      </span>
                   </div>

                   {alert.status === 'active' ? (
                     <div className="space-y-3">
                        <button 
                          onClick={() => window.open(`https://www.google.com/maps?q=${alert.lat},${alert.lng}`, '_blank')}
                          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-lg active:scale-95"
                        >
                          <Navigation className="w-4 h-4" /> TRACK LIVE LOCATION
                        </button>
                        <button 
                          onClick={() => updateDoc(doc(db, "alerts", alert.id), { status: "resolved" })}
                          className="w-full py-4 border-2 border-slate-900 rounded-2xl font-black text-xs tracking-widest hover:bg-slate-900 hover:text-white transition-all active:scale-95"
                        >
                          MARK RESOLVED
                        </button>
                     </div>
                   ) : (
                     <div className="py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-xs text-center border border-emerald-100 uppercase tracking-widest">
                        Situation Secured
                     </div>
                   )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 🔵 SECTION 3: GLOBAL BROADCAST COMMAND (YE AB NICHE HAI) */}
        <section className="bg-white border-2 border-blue-500/10 p-8 md:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden">
           <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-blue-600 p-4 rounded-2xl text-white shadow-xl shadow-blue-200">
                  <Smartphone className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic">Global Broadcast</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Send critical notification to all phones</p>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-6 items-end">
                <div className="flex-1 w-full space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Alert Heading</label>
                  <input 
                    type="text" placeholder="🚨 AREA EMERGENCY WARNING" value={pushTitle}
                    onChange={(e) => setPushTitle(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 px-6 py-4 rounded-2xl font-bold focus:border-blue-600 outline-none transition-all shadow-inner"
                  />
                </div>
                <div className="flex-[2] w-full space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Message Content</label>
                  <input 
                    type="text" placeholder="Explain the situation or provide instructions..." value={pushMessage}
                    onChange={(e) => setPushMessage(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 px-6 py-4 rounded-2xl font-bold focus:border-blue-600 outline-none transition-all shadow-inner"
                  />
                </div>
                <button 
                  onClick={handleSendPushNotification} disabled={isSending}
                  className="w-full lg:w-auto px-12 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs tracking-widest flex items-center justify-center gap-3 transition-all shadow-2xl shadow-blue-300 active:scale-95 disabled:opacity-50"
                >
                  {isSending ? "FIRE..." : "SEND BROADCAST"}
                  {!isSending && <Send className="w-5 h-5" />}
                </button>
              </div>
           </div>
           
           {/* Abstract Background element */}
           <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 opacity-5 pointer-events-none">
              <Smartphone className="w-64 h-64 text-blue-600" />
           </div>
        </section>

      </div>
      
      {/* ⚪ FOOTER SYSTEM INFO */}
      <footer className="p-8 text-center border-t border-slate-200 mt-auto">
         <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">SafeHelp Security Protocol v2.4.0</p>
      </footer>
    </div>
  );
}