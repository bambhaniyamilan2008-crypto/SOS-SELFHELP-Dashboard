"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle, MapPin, Phone, ShieldAlert, Users, Clock } from 'lucide-react';

// FIREBASE IMPORTS
import { collection, query, onSnapshot, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { db } from './firebaseConfig';

export default function Dashboard() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. GOD MODE REAL-TIME LISTENER
  useEffect(() => {
    // Alerts collection ko 50 items tak monitor karo taaki speed bani rahe
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
      
      // 🔥 FORCE STATE UPDATE: Naya array banakar state set kar rahe hain
      setAlerts([...alertsData]); 
      setLoading(false);
    }, (error) => {
      console.error("Firebase Snapshot Error:", error);
    });

    return () => unsubscribe();
  }, []);

  // 2. OPTIMISTIC RESOLVE FUNCTION
  const markAsResolved = useCallback(async (alertId) => {
    // UI se turant status badal do taaki user ko delay na lage
    setAlerts(current => 
      current.map(a => a.id === alertId ? { ...a, status: 'resolved' } : a)
    );

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

  const activeCount = alerts.filter(a => a.status === 'active').length;

  return (
    // 🔥 KEY ADDED: alerts.length badalte hi React UI refresh kar dega
    <div key={alerts.length} className="min-h-screen bg-gray-50 flex font-sans">
      {/* SIDEBAR */}
      <div className="w-64 bg-gray-900 text-white flex flex-col fixed h-full">
        <div className="p-6 flex items-center gap-3 border-b border-gray-800">
          <ShieldAlert className="text-red-500 w-8 h-8 animate-pulse" />
          <h1 className="text-2xl font-bold tracking-wider">SafeHelp</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <div className="flex items-center gap-3 p-3 bg-red-600 text-white rounded-xl font-bold shadow-lg">
            <AlertCircle className="w-5 h-5" /> Live Alerts
          </div>
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 p-8 ml-64">
        <header className="mb-8 flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">God Mode Console</h2>
            <p className="text-gray-500 font-medium mt-1 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
              Live Firebase Connection Active
            </p>
          </div>
          
          {activeCount > 0 ? (
            <div className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-3 animate-bounce shadow-xl shadow-red-200">
              <AlertCircle className="w-6 h-6" />
              {activeCount} EMERGENCY ACTIVE
            </div>
          ) : (
            <div className="bg-green-100 text-green-700 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 border border-green-200">
              <CheckCircle className="w-6 h-6" />
              System Status: Secure
            </div>
          )}
        </header>

        {loading ? (
          <div className="flex flex-col justify-center items-center h-96 space-y-4">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 font-bold tracking-widest">BOOTING COMMAND CENTER...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 bg-white rounded-3xl border-2 border-dashed border-gray-200 shadow-inner">
            <CheckCircle className="w-20 h-20 text-green-400 mb-6 opacity-20" />
            <h3 className="text-2xl font-bold text-gray-400 uppercase tracking-tighter">No Inbound Signals</h3>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`group relative p-8 rounded-[2.5rem] border-2 transition-all duration-500 ${
                  alert.status === 'active' 
                    ? 'bg-white border-red-600 shadow-2xl scale-100' 
                    : 'bg-gray-50 border-transparent opacity-40 grayscale scale-95'
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-4 rounded-3xl ${alert.status === 'active' ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'bg-gray-200 text-gray-500'}`}>
                    {alert.status === 'active' ? <ShieldAlert className="w-8 h-8 animate-pulse" /> : <CheckCircle className="w-8 h-8" />}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black uppercase text-gray-400 mb-1">Time Log</p>
                    <span className="text-sm font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-full">
                      {alert.timestamp?.seconds 
                        ? new Date(alert.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'}) 
                        : "JUST NOW"}
                    </span>
                  </div>
                </div>
                
                <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">
                  {alert.userName || "ANONYMOUS USER"}
                </h3>
                
                <div className="flex gap-2 mb-6">
                  <span className="px-3 py-1 bg-gray-900 text-white text-[10px] font-black rounded-lg uppercase tracking-widest">
                    {alert.type || "SOS"}
                  </span>
                  <span className="px-3 py-1 bg-red-100 text-red-600 text-[10px] font-black rounded-lg uppercase tracking-widest">
                    PRIORITY 1
                  </span>
                </div>
                
                <div className="space-y-4 mb-8 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm"><MapPin className="w-5 h-5 text-red-600" /></div>
                    <p className="text-gray-700 font-bold text-sm">LAT: {alert.lat || "N/A"} | LNG: {alert.lng || "N/A"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm"><Phone className="w-5 h-5 text-blue-600" /></div>
                    <p className="text-gray-700 font-bold text-sm">{alert.phone || "No Contact"}</p>
                  </div>
                </div>

                {alert.status === 'active' ? (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => markAsResolved(alert.id)}
                      className="flex-1 bg-red-600 hover:bg-black text-white py-4 rounded-2xl font-black transition-all transform hover:translate-y-[-2px] active:scale-95 shadow-xl shadow-red-100">
                      RESOLVE NOW
                    </button>
                    <button 
                      className="px-5 bg-gray-900 text-white rounded-2xl hover:bg-blue-600 transition-colors"
                      onClick={() => window.open(`https://maps.google.com/?q=${alert.lat},${alert.lng}`, '_blank')}
                    >
                      <MapPin className="w-6 h-6" />
                    </button>
                  </div>
                ) : (
                  <div className="w-full bg-green-50 text-green-600 py-4 rounded-2xl font-black text-center border border-green-200">
                    SITUATION SECURED
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