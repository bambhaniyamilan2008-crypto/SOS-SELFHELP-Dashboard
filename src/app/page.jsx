"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertCircle, MapPin, ShieldAlert, Clock, Trash2, ExternalLink,
  Shield, Activity, MessageCircle
} from 'lucide-react';

// FIREBASE IMPORTS 
import { 
  collection, query, onSnapshot, doc, 
  updateDoc, deleteDoc, orderBy, limit 
} from 'firebase/firestore';
import { db } from './firebaseConfig';

export default function SOSAdminPanel() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. HIGH-ACCURACY REAL-TIME LISTENER
  useEffect(() => {
    const q = query(
      collection(db, "alerts"), 
      orderBy("timestamp", "desc"), 
      limit(100) 
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const alertsData = [];
      querySnapshot.forEach((doc) => {
        alertsData.push({ id: doc.id, ...doc.data() });
      });
      setAlerts([...alertsData]); 
      setLoading(false);
    }, (error) => {
      console.error("Firebase Sync Error:", error);
    });

    return () => unsubscribe();
  }, []);

  const markAsResolved = useCallback(async (alertId) => {
    try {
      const alertRef = doc(db, "alerts", alertId);
      await updateDoc(alertRef, { status: "resolved", resolvedAt: new Date().toISOString() });
    } catch (error) { console.error("Error resolving alert:", error); }
  }, []);

  const deleteAlert = async (alertId) => {
    if (window.confirm("Are you sure you want to permanently delete this record?")) {
      try { await deleteDoc(doc(db, "alerts", alertId)); } 
      catch (error) { console.error("Delete Error:", error); }
    }
  };

  const sendWhatsAppAlert = (alert) => {
    const mapLink = `http://googleusercontent.com/maps.google.com/${alert.lat},${alert.lng}`;
    const message = `🚨 *URGENT SOS EMERGENCY* 🚨\n\n*Name:* ${alert.userName || "Unknown"}\n*Phone:* ${alert.phone || "N/A"}\n\nUser is in danger. Please track the live location below immediately:\n📍 ${mapLink}`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const activeCount = alerts.filter(a => a.status === 'active').length;

  return (
    <div key={alerts.length} className="min-h-screen bg-[#f8fafc] flex font-sans antialiased text-slate-900">
      
      {/* 🟢 SIDEBAR: Fixed Control Center */}
      <aside className="w-72 bg-slate-950 text-white flex flex-col fixed h-full shadow-2xl z-50">
        <div className="p-8 flex items-center gap-4 border-b border-slate-800/50">
          <div className="bg-red-600 p-2 rounded-lg shadow-lg shadow-red-900/20">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight uppercase italic">SafeHelp Admin</h1>
        </div>
        
        <nav className="flex-1 p-6 space-y-3">
          <div className="w-full flex items-center justify-between p-4 rounded-2xl font-bold transition-all bg-red-600 text-white shadow-lg shadow-red-900/20">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5" />
              <span>Live Monitor</span>
            </div>
            {activeCount > 0 && (
              <span className="bg-white text-red-600 text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse text-xs">LIVE</span>
            )}
          </div>
        </nav>
      </aside>

      {/* 🔵 MAIN CONTENT AREA */}
      <main className="flex-1 ml-72 p-12">
        <header className="mb-12 flex justify-between items-end border-b border-slate-200 pb-8">
          <div>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter">Emergency Monitor</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Active Surveillance Feed
            </p>
          </div>
          <div className="bg-white border-2 border-slate-100 px-8 py-4 rounded-3xl shadow-sm flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Threats</span>
            <span className={`text-2xl font-black ${activeCount > 0 ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>
              {activeCount.toString().padStart(2, '0')}
            </span>
          </div>
        </header>

        {/* ALERTS GRID */}
        {loading ? (
          <div className="flex justify-center py-20 font-black text-slate-300 animate-pulse uppercase tracking-[0.5em]">
            Initializing Secure Stream...
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`group relative p-8 rounded-[2.5rem] border-2 transition-all duration-500 hover:-translate-y-1 ${
                  alert.status === 'active' 
                  ? 'bg-white border-red-600 shadow-2xl scale-100' 
                  : 'bg-slate-100/50 border-transparent grayscale-[0.5] opacity-80 scale-95'
                }`}
              >
                <button 
                  onClick={() => deleteAlert(alert.id)}
                  className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all rounded-xl"
                >
                  <Trash2 className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-5 mb-8">
                  <div className={`p-4 rounded-3xl shadow-lg transition-transform group-hover:scale-110 ${
                    alert.status === 'active' ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-300 text-slate-500'
                  }`}>
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-none tracking-tight uppercase italic truncate">
                      {alert.userName || "SECURE USER"}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-400 mt-2 flex items-center gap-1 uppercase tracking-widest">
                      <Clock className="w-3 h-3" />
                      {alert.timestamp?.seconds ? new Date(alert.timestamp.seconds * 1000).toLocaleString() : "SYNCING..."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 mb-6">
                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                      <MapPin className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Coordinates</p>
                      <p className="text-xs font-bold text-slate-700">
                        {alert.lat && alert.lng ? `${alert.lat.toFixed(4)}° N, ${alert.lng.toFixed(4)}° E` : "SIGNAL WEAK"}
                      </p>
                    </div>
                  </div>
                </div>

                {alert.status === 'active' ? (
                  <>
                    {/* 🔥 HOT-LINKS SECTION */}
                    <div className="flex justify-between gap-3 mb-6">
                      <button 
                        onClick={() => window.open('tel:100')} 
                        className="flex-1 flex flex-col items-center justify-center py-3 bg-blue-50 text-blue-700 rounded-2xl hover:bg-blue-600 hover:text-white transition-all border border-blue-100 group/btn shadow-sm"
                      >
                        <Shield className="w-5 h-5 mb-1 group-hover/btn:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Police</span>
                      </button>

                      <button 
                        onClick={() => window.open('tel:108')} 
                        className="flex-1 flex flex-col items-center justify-center py-3 bg-rose-50 text-rose-700 rounded-2xl hover:bg-rose-600 hover:text-white transition-all border border-rose-100 group/btn shadow-sm"
                      >
                        <Activity className="w-5 h-5 mb-1 group-hover/btn:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Medical</span>
                      </button>

                      <button 
                        onClick={() => sendWhatsAppAlert(alert)} 
                        className="flex-1 flex flex-col items-center justify-center py-3 bg-emerald-50 text-emerald-700 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 group/btn shadow-sm"
                      >
                        <MessageCircle className="w-5 h-5 mb-1 group-hover/btn:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Family</span>
                      </button>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex gap-3">
                      <button 
                        onClick={() => markAsResolved(alert.id)}
                        className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs tracking-widest hover:bg-red-600 transition-all shadow-lg active:scale-95"
                      >
                        MARK AS RESOLVED
                      </button>
                      <button 
                        onClick={() => window.open(`http://googleusercontent.com/maps.google.com/${alert.lat},${alert.lng}`, '_blank')}
                        className="w-16 bg-white border-2 border-slate-900 text-slate-900 rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-all active:scale-95"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full bg-emerald-50 text-emerald-600 py-4 rounded-2xl font-black text-xs tracking-widest text-center border border-emerald-100 uppercase italic">
                    Situation Resolved
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}