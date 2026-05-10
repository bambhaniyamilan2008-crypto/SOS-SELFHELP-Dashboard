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
    });
    return () => unsubscribe();
  }, []);

  const handleSendPushNotification = async () => {
    if (!pushTitle || !pushMessage) {
      alert("Error: Please provide both Title and Message!");
      return;
    }
    setIsSending(true);
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      let tokens = [];
      usersSnap.forEach(doc => {
        if (doc.data().expoPushToken) tokens.push(doc.data().expoPushToken);
      });
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: tokens, sound: "default", title: pushTitle, body: pushMessage }),
      });
      alert("Broadcast Sent Successfully!");
      setPushTitle(""); setPushMessage("");
    } catch (e) { alert("Broadcast Failed!"); }
    setIsSending(false);
  };

  const activeCount = alerts.filter(a => a.status === 'active').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 p-6 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-red-600" />
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">SafeHelp Command</h1>
          </div>
          <div className="bg-slate-900 text-white px-6 py-2 rounded-xl flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Live Alerts:</span>
            <span className="text-xl font-black text-red-500 animate-pulse">{activeCount}</span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto w-full p-6 md:p-10 flex flex-col gap-16">
        
        {/* SECTION 1: LIVE MONITOR (TOP) */}
        <section className="w-full">
          <div className="flex items-center gap-3 mb-8 border-l-4 border-red-600 pl-4">
             <Activity className="w-6 h-6 text-red-600" />
             <h2 className="text-2xl font-black uppercase italic text-slate-800">Live Emergency Monitor</h2>
          </div>

          {loading ? (
            <div className="py-20 text-center font-black text-slate-300 animate-pulse italic">SYNCING SECURE DATABASE...</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {alerts.map((alert) => (
                <div key={alert.id} className={`p-8 rounded-[2.5rem] border-2 transition-all ${alert.status === 'active' ? 'bg-white border-red-600 shadow-xl scale-100' : 'bg-slate-200/50 border-transparent opacity-60 scale-95 grayscale'}`}>
                   <div className="flex justify-between items-start mb-6">
                      <div className={`p-4 rounded-2xl ${alert.status === 'active' ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-400'}`}>
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <button onClick={() => deleteDoc(doc(db, "alerts", alert.id))} className="text-slate-300 hover:text-red-600">
                        <Trash2 className="w-5 h-5" />
                      </button>
                   </div>
                   <h3 className="text-lg font-black uppercase italic truncate">{alert.userName || "SECURE USER"}</h3>
                   <p className="text-[10px] font-bold text-slate-400 mb-6 flex items-center gap-2">
                     <Clock className="w-3 h-3" /> {alert.timestamp?.seconds ? new Date(alert.timestamp.seconds * 1000).toLocaleTimeString() : "Syncing..."}
                   </p>
                   {alert.status === 'active' ? (
                     <div className="space-y-3">
                        <button onClick={() => window.open(`https://www.google.com/maps?q=${alert.lat},${alert.lng}`, '_blank')} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-red-600 transition-all">
                          <Navigation className="w-4 h-4" /> TRACK LOCATION
                        </button>
                        <button onClick={() => updateDoc(doc(db, "alerts", alert.id), { status: "resolved" })} className="w-full py-3 border-2 border-slate-900 rounded-xl font-black text-[10px] tracking-widest hover:bg-slate-900 hover:text-white transition-all">
                          MARK RESOLVED
                        </button>
                     </div>
                   ) : (
                     <div className="py-3 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] text-center uppercase tracking-widest border border-emerald-100">Safe & Secured</div>
                   )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 2: GLOBAL BROADCAST (BOTTOM) */}
        <section className="w-full mt-auto">
           <div className="bg-slate-900 p-10 md:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden border-b-8 border-blue-600">
              <div className="relative z-10">
                <div className="flex items-center gap-5 mb-10">
                  <div className="bg-blue-600 p-4 rounded-2xl text-white shadow-xl shadow-blue-500/50">
                    <Smartphone className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Global Broadcast Dispatch</h3>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Send critical notification to all active devices</p>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-end">
                  <div className="flex-1 w-full space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Notification Title</label>
                    <input 
                      type="text" placeholder="E.g. EMERGENCY ALERT" value={pushTitle}
                      onChange={(e) => setPushTitle(e.target.value)}
                      className="w-full bg-slate-800 border-2 border-slate-700 px-6 py-4 rounded-2xl font-bold text-white placeholder:text-slate-600 focus:border-blue-600 outline-none transition-all"
                    />
                  </div>
                  <div className="flex-[2] w-full space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Broadcast Message</label>
                    <input 
                      type="text" placeholder="Explain the situation clearly..." value={pushMessage}
                      onChange={(e) => setPushMessage(e.target.value)}
                      className="w-full bg-slate-800 border-2 border-slate-700 px-6 py-4 rounded-2xl font-bold text-white placeholder:text-slate-600 focus:border-blue-600 outline-none transition-all"
                    />
                  </div>
                  <button 
                    onClick={handleSendPushNotification} disabled={isSending}
                    className="w-full lg:w-auto px-12 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                  >
                    {isSending ? "DISPATCHING..." : "SEND BROADCAST"}
                    {!isSending && <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="absolute top-0 right-0 opacity-5 pointer-events-none translate-x-10 translate-y-[-10%]">
                 <Smartphone className="w-64 h-64 text-white" />
              </div>
           </div>
        </section>
      </main>

      <footer className="p-10 text-center border-t border-slate-200 mt-10">
         <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.6em]">System Protocol v2.4.0 Authorized Access Only</p>
      </footer>
    </div>
  );
}