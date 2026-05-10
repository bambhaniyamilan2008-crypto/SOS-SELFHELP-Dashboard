"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertCircle, MapPin, Phone, ShieldAlert, Users, 
  Clock, Trash2, ExternalLink, Shield, Activity, 
  MessageCircle, Smartphone, Send 
} from 'lucide-react';

// FIREBASE IMPORTS
import { 
  collection, query, onSnapshot, doc, 
  updateDoc, deleteDoc, orderBy, limit, getDocs 
} from 'firebase/firestore';
import { db } from './firebaseConfig'; // 👈 Path check kar lena agar error aaye

export default function BroadcastNotification() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 🔥 Push Notification States
  const [pushTitle, setPushTitle] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // 1. LIVE SOS ALERTS LISTENER
  useEffect(() => {
    const q = query(
      collection(db, "alerts"), 
      orderBy("timestamp", "desc"), 
      limit(50) 
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const alertsData = [];
      querySnapshot.forEach((doc) => {
        alertsData.push({ id: doc.id, ...doc.data() });
      });
      setAlerts([...alertsData]); 
      setLoading(false);
    }, (error) => {
      console.error("Firebase Error:", error);
    });

    return () => unsubscribe();
  }, []);

  // 2. BROADCAST PUSH NOTIFICATION LOGIC
  const handleSendPushNotification = async () => {
    if (!pushTitle || !pushMessage) {
      alert("⚠️ Title or message is required!");
      return;
    }

    setIsSending(true);
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      let expoPushTokens = [];
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.expoPushToken) expoPushTokens.push(userData.expoPushToken);
      });

      if (expoPushTokens.length === 0) {
        alert("❌ Database mein koi token nahi mila!");
        setIsSending(false);
        return;
      }

      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: expoPushTokens, 
          sound: "default",
          title: pushTitle,
          body: pushMessage,
        }),
      });

      alert(`✅ SUCCESS! Message sent! ${expoPushTokens.length} All users notified.`);
      setPushTitle(""); setPushMessage("");
    } catch (error) {
      alert("❌ Error: Notification nahi gayi.");
    }
    setIsSending(false);
  };

  const markAsResolved = async (alertId) => {
    try {
      await updateDoc(doc(db, "alerts", alertId), { 
        status: "resolved", 
        resolvedAt: new Date().toISOString() 
      });
    } catch (e) { console.error(e); }
  };

  const deleteAlert = async (alertId) => {
    if (window.confirm("Bhai, kya aap is record ko mita dena chahte ho?")) {
      await deleteDoc(doc(db, "alerts", alertId));
    }
  };

  const activeCount = alerts.filter(a => a.status === 'active').length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans">
      
      {/* 🚀 TOP SECTION: COMMAND CENTER (Push Notifications) */}
      <div className="max-w-6xl mx-auto mb-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Admin Command Center</h1>
            <p className="text-slate-500 font-bold">Real-time Global Alert System</p>
          </div>
          <div className="bg-white border-2 border-red-100 px-6 py-3 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active SOS</span>
              <span className={`text-2xl font-black ${activeCount > 0 ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>{activeCount}</span>
            </div>
            <div className="bg-red-600 p-2 rounded-lg text-white">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>
        </header>

        {/* BROADCAST BOX */}
        <div className="bg-white border-2 border-blue-500/10 p-6 md:p-8 rounded-[2.5rem] shadow-xl flex flex-col xl:flex-row gap-6 items-center">
          <div className="flex items-center gap-4 xl:w-1/4 w-full">
            <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-200">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 uppercase">Global Push</h3>
              <p className="text-xs font-bold text-slate-400">Broadcast to all apps</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col md:flex-row gap-4 w-full">
            <input 
              type="text" placeholder="Title (e.g., 🚨 Alert!)" value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              className="flex-1 bg-slate-50 border-2 border-slate-100 px-4 py-3 rounded-2xl font-bold focus:border-blue-500 outline-none transition-all"
            />
            <input 
              type="text" placeholder="Your message here..." value={pushMessage}
              onChange={(e) => setPushMessage(e.target.value)}
              className="flex-[2] bg-slate-50 border-2 border-slate-100 px-4 py-3 rounded-2xl font-bold focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <button 
            onClick={handleSendPushNotification} disabled={isSending}
            className="w-full xl:w-auto px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50"
          >
            {isSending ? "SENDING..." : "FIRE BROADCAST"}
            {!isSending && <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 🚨 BOTTOM SECTION: LIVE ALERTS LIST */}
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl font-black text-slate-900 uppercase italic mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-red-600" /> Live Emergency Monitor
        </h2>
        
        {loading ? (
          <div className="text-center py-20 font-black text-slate-300 animate-pulse">SYNCING WITH DATABASE...</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {alerts.map((alert) => (
              <div key={alert.id} className={`p-6 rounded-[2rem] border-2 transition-all ${alert.status === 'active' ? 'bg-white border-red-600 shadow-2xl scale-100' : 'bg-slate-100/50 border-transparent opacity-70 scale-95 grayscale'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-2xl ${alert.status === 'active' ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-300 text-slate-500'}`}>
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <button onClick={() => deleteAlert(alert.id)} className="text-slate-300 hover:text-red-600 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                <h3 className="font-black text-slate-900 uppercase italic text-lg truncate">{alert.userName || "SECURE USER"}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {alert.timestamp?.seconds ? new Date(alert.timestamp.seconds * 1000).toLocaleTimeString() : "Pending"}
                </p>

                {alert.status === 'active' ? (
                  <div className="space-y-3">
                    <button onClick={() => window.open(`https://www.google.com/maps?q=${alert.lat},${alert.lng}`, '_blank')} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-red-600 transition-all">
                      <MapPin className="w-4 h-4" /> OPEN MAPS
                    </button>
                    <button onClick={() => markAsResolved(alert.id)} className="w-full py-3 border-2 border-slate-900 rounded-xl font-black text-[10px] tracking-widest hover:bg-slate-900 hover:text-white transition-all">
                      RESOLVE THREAT
                    </button>
                  </div>
                ) : (
                  <div className="py-3 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] text-center uppercase tracking-widest border border-emerald-100">
                    Safe & Resolved
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}