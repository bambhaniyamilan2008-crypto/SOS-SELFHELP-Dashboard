"use client";
import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, MapPin, ShieldAlert, Clock, Trash2, 
  Activity, Smartphone, Send, Navigation
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

  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("timestamp", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => console.error("Firebase Sync Error", err));
    return () => unsubscribe();
  }, []);

  const handleSendPushNotification = async () => {
    if (!pushTitle || !pushMessage) {
      alert("Error: Please enter both Title and Message content!");
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
        alert("System Error: No registered device tokens found in database!");
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

      alert(`✅ Dispatch Successful! Sent to ${tokens.length} devices.`);
      setPushTitle(""); setPushMessage("");
    } catch (e) {
      alert("Critical Error: Broadcast transmission failed.");
    }
    setIsSending(false);
  };

  const activeCount = alerts.filter(a => a.status === 'active').length;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-900">
      
      {/* 🟢 HEADER: REAL-TIME STATUS */}
      <div className="bg-white border-b border-slate-200 p-6 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-3 rounded-2xl shadow-lg">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter italic">SafeHelp Command</h1>
              <div className="flex items-center gap-2 text-emerald-500">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Encrypted Monitor Active</span>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 px-8 py-3 rounded-2xl flex flex-col items-end border-r-4 border-red-600">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active SOS Requests</span>
            <span className={`text-2xl font-black ${activeCount > 0 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              {activeCount.toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full p-6 md:p-10 flex flex-col gap-16">
        
        {/* 🚨 SECTION 1: LIVE EMERGENCY MONITOR (ALWAYS ON TOP) */}
        <section className="space-y-8">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
               <Activity className="w-6 h-6 text-red-600" />
               <h2 className="text-2xl font-black uppercase italic tracking-tight">Live Emergency Feed</h2>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-4 py-2 rounded-lg">
              Auto-Refresh Enabled
            </span>
          </div>

          {loading ? (
            <div className="py-20 text-center flex flex-col items-center gap-4">
               <div className="w-12 h-12 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></div>
               <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Fetching Secure Stream...</p>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {alerts.length === 0 && (
                <div className="col-span-full bg-white p-16 rounded-[3rem] text-center border-4 border-dashed border-slate-100">
                   <p className="font-black text-slate-300 uppercase tracking-widest text-sm">No Active Emergency Signals Detected</p>
                </div>
              )}
              {alerts.map((alert) => (
                <div key={alert.id} className={`group p-8 rounded-[2.5rem] border-2 transition-all duration-500 ${alert.status === 'active' ? 'bg-white border-red-600 shadow-[0_25px_50px_-12px_rgba(220,38,38,0.25)]' : 'bg-slate-50 border-transparent opacity-60 grayscale scale-95'}`}>
                   <div className="flex justify-between items-start mb-6">
                      <div className={`p-4 rounded-3xl transition-transform group-hover:scale-110 ${alert.status === 'active' ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-400 text-slate-100'}`}>
                        <AlertCircle className="w-7 h-7" />
                      </div>
                      <button onClick={() => deleteDoc(doc(db, "alerts", alert.id))} className="text-slate-300 hover:text-red-600 p-2 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                   </div>
                   
                   <h3 className="text-xl font-black uppercase italic truncate text-slate-900">{alert.userName || "ANONYMOUS USER"}</h3>
                   <div className="flex items-center gap-2 text-slate-400 mb-8 border-b border-slate-100 pb-2">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        {alert.timestamp?.seconds ? new Date(alert.timestamp.seconds * 1000).toLocaleString() : "Syncing Time..."}
                      </span>
                   </div>

                   {alert.status === 'active' ? (
                     <div className="space-y-3">
                        <button 
                          onClick={() => window.open(`https://www.google.com/maps?q=${alert.lat},${alert.lng}`, '_blank')}
                          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-lg"
                        >
                          <Navigation className="w-4 h-4" /> INITIATE TRACKING
                        </button>
                        <button 
                          onClick={() => updateDoc(doc(db, "alerts", alert.id), { status: "resolved" })}
                          className="w-full py-4 border-2 border-slate-900 rounded-2xl font-black text-xs tracking-widest hover:bg-slate-900 hover:text-white transition-all"
                        >
                          RESOLVE INCIDENT
                        </button>
                     </div>
                   ) : (
                     <div className="py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-xs text-center border border-emerald-100 uppercase tracking-widest italic">
                        Incident Resolved
                     </div>
                   )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 🔵 SECTION 2: GLOBAL DISPATCH COMMAND (FIXED TO BOTTOM) */}
        <section className="bg-slate-900 p-10 md:p-14 rounded-[4rem] shadow-2xl relative overflow-hidden border-b-8 border-blue-600">
           <div className="relative z-10">
              <div className="flex items-center gap-5 mb-10">
                <div className="bg-blue-600 p-5 rounded-3xl text-white shadow-2xl shadow-blue-500/40">
                  <Smartphone className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">Global Broadcast Dispatch</h3>
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Authorized system-wide notification portal</p>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-8 items-end">
                <div className="flex-1 w-full space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-3">Notification Headline</label>
                  <input 
                    type="text" placeholder="E.g. SEVERE WEATHER ALERT" value={pushTitle}
                    onChange={(e) => setPushTitle(e.target.value)}
                    className="w-full bg-slate-800 border-2 border-slate-700 px-6 py-5 rounded-[2rem] font-bold text-white placeholder:text-slate-600 focus:border-blue-600 outline-none transition-all"
                  />
                </div>
                <div className="flex-[2] w-full space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-3">Detailed Message Content</label>
                  <input 
                    type="text" placeholder="Explain the emergency or safety instructions clearly..." value={pushMessage}
                    onChange={(e) => setPushMessage(e.target.value)}
                    className="w-full bg-slate-800 border-2 border-slate-700 px-6 py-5 rounded-[2rem] font-bold text-white placeholder:text-slate-600 focus:border-blue-600 outline-none transition-all"
                  />
                </div>
                <button 
                  onClick={handleSendPushNotification} disabled={isSending}
                  className="w-full lg:w-auto px-14 h-20 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-black text-sm tracking-widest flex items-center justify-center gap-4 transition-all shadow-3xl active:scale-95 disabled:opacity-50"
                >
                  {isSending ? "DISPATCHING..." : "EXECUTE BROADCAST"}
                  {!isSending && <Send className="w-6 h-6" />}
                </button>
              </div>
           </div>
           
           {/* Futuristic Background Decoration */}
           <div className="absolute -bottom-20 -right-20 opacity-10 pointer-events-none rotate-12">
              <ShieldAlert className="w-96 h-96 text-white" />
           </div>
        </section>

      </div>
      
      <footer className="p-10 text-center bg-white mt-10 border-t border-slate-200">
         <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.8em]">Security Infrastructure Control v2.4.0</p>
      </footer>
    </div>
  );
}