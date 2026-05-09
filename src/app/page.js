"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertCircle, CheckCircle, MapPin, Phone, 
  ShieldAlert, Users, Clock, Trash2, ExternalLink 
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
    // Alerts collection ko monitor kar raha hai (God Mode)
    const q = query(
      collection(db, "alerts"), 
      orderBy("timestamp", "desc"), 
      limit(100) // Accuracy ke liye limit badha di hai
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const alertsData = [];
      querySnapshot.forEach((doc) => {
        alertsData.push({ id: doc.id, ...doc.data() });
      });
      // Force update with spread to ensure React detects changes
      setAlerts([...alertsData]); 
      setLoading(false);
    }, (error) => {
      console.error("Firebase Sync Error:", error);
    });

    return () => unsubscribe();
  }, []);

  // 2. RESOLVE FUNCTION
  const markAsResolved = useCallback(async (alertId) => {
    try {
      const alertRef = doc(db, "alerts", alertId);
      await updateDoc(alertRef, { 
        status: "resolved", 
        resolvedAt: new Date().toISOString() 
      });
    } catch (error) {
      console.error("Error resolving alert:", error);
    }
  }, []);

  // 3. DELETE FUNCTION (With Confirmation)
  const deleteAlert = async (alertId) => {
    if (window.confirm("Are you sure you want to permanently delete this record?")) {
      try {
        await deleteDoc(doc(db, "alerts", alertId));
      } catch (error) {
        console.error("Delete Error:", error);
      }
    }
  };

  const activeCount = alerts.filter(a => a.status === 'active').length;

  return (
    <div key={alerts.length} className="min-h-screen bg-[#f8fafc] flex font-sans antialiased text-slate-900">
      {/* SIDEBAR */}
      <div className="w-72 bg-slate-950 text-white flex flex-col fixed h-full shadow-2xl z-50">
        <div className="p-8 flex items-center gap-4 border-b border-slate-800/50">
          <div className="bg-red-600 p-2 rounded-lg shadow-lg shadow-red-900/20">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight uppercase italic">SOS Admin</h1>
        </div>
        
        <nav className="flex-1 p-6 space-y-3">
          <div className="flex items-center justify-between p-4 bg-red-600/10 border border-red-600/20 text-red-500 rounded-2xl font-bold transition-all">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              <span>Live Monitor</span>
            </div>
            {activeCount > 0 && (
              <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
            )}
          </div>
          <div className="flex items-center gap-3 p-4 text-slate-500 hover:text-slate-300 transition-colors cursor-not-allowed">
            <Users className="w-5 h-5" />
            <span className="font-semibold text-sm">Responders</span>
          </div>
        </nav>

        <div className="p-6 border-t border-slate-800/50">
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">System Status</p>
            <p className="text-xs font-bold text-emerald-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
              Encrypted & Live
            </p>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 p-10 ml-72">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">SOS Admin Panel</h2>
            <p className="text-slate-500 font-bold mt-2 flex items-center gap-2">
              Command Center v2.0 <span className="text-slate-300">|</span> Real-time Emergency Tracking
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-white border border-slate-200 px-6 py-4 rounded-3xl shadow-sm flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Threats</span>
              <span className={`text-2xl font-black ${activeCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                {activeCount.toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></div>
            <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Accessing Secure Database...</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`group relative p-8 rounded-[2.5rem] border-2 transition-all duration-500 hover:-translate-y-1 ${
                  alert.status === 'active' 
                  ? 'bg-white border-red-600 shadow-[0_20px_50px_rgba(220,38,38,0.1)]' 
                  : 'bg-slate-100/50 border-transparent grayscale-[0.5] opacity-80'
                }`}
              >
                {/* DELETE BUTTON */}
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
                    <h3 className="text-xl font-black text-slate-900 leading-none tracking-tight">
                      {alert.userName || "SECURE USER"}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-400 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {alert.timestamp?.seconds 
                        ? new Date(alert.timestamp.seconds * 1000).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short' }) 
                        : "SYNCING..."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 mb-8">
                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 group-hover:bg-white transition-colors">
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

                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 group-hover:bg-white transition-colors">
                    <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                      <Phone className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Hash</p>
                      <p className="text-xs font-bold text-slate-700">{alert.phone || "UNREGISTERED"}</p>
                    </div>
                  </div>
                </div>

                {alert.status === 'active' ? (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => markAsResolved(alert.id)}
                      className="flex-2 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs tracking-widest hover:bg-red-600 transition-all shadow-lg active:scale-95"
                    >
                      MARK AS RESOLVED
                    </button>
                    <button 
                      onClick={() => window.open(`https://maps.google.com/?q=${alert.lat},${alert.lng}`, '_blank')}
                      className="flex-1 bg-white border-2 border-slate-900 text-slate-900 rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-all active:scale-95"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-full bg-emerald-50 text-emerald-600 py-4 rounded-2xl font-black text-xs tracking-widest text-center border border-emerald-100 uppercase">
                    Situation Resolved
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