"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertCircle, MapPin, ShieldAlert, Clock, Trash2, ExternalLink,
  Shield, Activity, MessageCircle, Smartphone, Send, Users, UserX
} from 'lucide-react';

// FIREBASE IMPORTS 
import { 
  collection, query, onSnapshot, doc, 
  updateDoc, deleteDoc, orderBy, limit, getDocs
} from 'firebase/firestore';
import { db } from './firebaseConfig';

export default function SOSAdminPanel() {
  // 🟢 NAVIGATION STATE (Master Switch)
  const [activeTab, setActiveTab] = useState("monitor"); 

  // 🔴 1. MONITOR STATES
  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  // 🔵 2. PUSH NOTIFICATION STATES
  const [pushTitle, setPushTitle] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // 🟠 3. USERS STATES
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // ==========================================
  // 📡 FUNCTION: REAL-TIME MONITORING
  // ==========================================
  useEffect(() => {
    const q = query(collection(db, "alerts"), orderBy("timestamp", "desc"), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingAlerts(false);
    });
    return () => unsubscribe();
  }, []);

  const markAsResolved = async (alertId) => {
    await updateDoc(doc(db, "alerts", alertId), { status: "resolved", resolvedAt: new Date().toISOString() });
  };
  const deleteAlert = async (alertId) => {
    if (window.confirm("Permanently delete this alert record?")) await deleteDoc(doc(db, "alerts", alertId));
  };

  // ==========================================
  // 🚀 FUNCTION: SEND PUSH NOTIFICATION
  // ==========================================
  const handleSendPush = async () => {
    if (!pushTitle || !pushMessage) { alert("⚠️ Please enter Title and Message"); return; }
    setIsSending(true);
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      let tokens = [];
      usersSnap.forEach(u => { if (u.data().expoPushToken) tokens.push(u.data().expoPushToken); });

      if (tokens.length === 0) { alert("❌ No devices registered for notifications!"); setIsSending(false); return; }

      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: tokens, sound: "default", title: pushTitle, body: pushMessage }),
      });
      alert(`✅ Broadcast sent to ${tokens.length} devices!`);
      setPushTitle(""); setPushMessage("");
    } catch (e) { alert("❌ Failed to send notifications."); }
    setIsSending(false);
  };

  // ==========================================
  // 👥 FUNCTION: FETCH & DELETE USERS
  // ==========================================
  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      setUsersList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) { console.error("Error fetching users", e); }
    setLoadingUsers(false);
  };

  const deleteUserRecord = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete user: ${userName}? This cannot be undone.`)) {
      await deleteDoc(doc(db, "users", userId));
      fetchAllUsers(); // Refresh list after delete
    }
  };

  const activeCount = alerts.filter(a => a.status === 'active').length;

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans antialiased text-slate-900">
      
      {/* 🟢 SIDEBAR: FIXED NAVIGATION */}
      <aside className="w-72 bg-slate-950 text-white flex flex-col fixed h-full shadow-2xl z-50">
        <div className="p-8 flex items-center gap-4 border-b border-slate-800/50">
          <div className="bg-red-600 p-2 rounded-lg shadow-lg">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black uppercase italic">SOS Admin</h1>
        </div>
        
        <nav className="flex-1 p-6 space-y-4">
          {/* TAB 1: LIVE MONITOR */}
          <button onClick={() => setActiveTab("monitor")} className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold transition-all ${activeTab === "monitor" ? "bg-red-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-900"}`}>
            <div className="flex items-center gap-3"><Activity className="w-5 h-5" /><span>Live Monitor</span></div>
            {activeCount > 0 && <span className="bg-white text-red-600 text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">LIVE</span>}
          </button>

          {/* TAB 2: PUSH BROADCAST */}
          <button onClick={() => setActiveTab("push")} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === "push" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-900"}`}>
            <Smartphone className="w-5 h-5" /><span>Push Broadcast</span>
          </button>

          {/* TAB 3: USER MANAGEMENT (Fixed!) */}
          <button 
            onClick={() => {
              setActiveTab("users");
              fetchAllUsers(); // ✅ Data button click par fetch hoga, error khatam!
            }} 
            className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === "users" ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-900"}`}
          >
            <Users className="w-5 h-5" /><span>User Database</span>
          </button>
        </nav>
      </aside>

      {/* 🔵 MAIN CONTENT AREA */}
      <main className="flex-1 ml-72 p-12">
        
        {/* =========================================
            SCREEN 1: LIVE MONITOR
        ========================================= */}
        {activeTab === "monitor" && (
          <div className="animate-in fade-in slide-in-from-left duration-300">
            <header className="mb-10 flex justify-between items-end border-b border-slate-200 pb-8">
              <div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter">Emergency Monitor</h2>
                <p className="text-slate-400 text-xs font-bold uppercase mt-2">Active Surveillance Feed</p>
              </div>
              <div className="bg-white border-2 border-slate-100 px-6 py-3 rounded-2xl shadow-sm flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Threats</span>
                <span className={`text-2xl font-black ${activeCount > 0 ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>{activeCount.toString().padStart(2, '0')}</span>
              </div>
            </header>

            {loadingAlerts ? (
              <div className="font-black text-slate-300 animate-pulse uppercase text-center mt-20">Initializing Stream...</div>
            ) : (
              <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className={`p-8 rounded-[2.5rem] border-2 transition-all ${alert.status === 'active' ? 'bg-white border-red-600 shadow-2xl' : 'bg-slate-50 border-transparent opacity-60'}`}>
                    <div className="flex justify-between mb-6">
                      <div className={`p-4 rounded-3xl ${alert.status === 'active' ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-400'}`}><ShieldAlert className="w-7 h-7" /></div>
                      <button onClick={() => deleteAlert(alert.id)} className="text-slate-300 hover:text-red-600"><Trash2 className="w-5 h-5" /></button>
                    </div>
                    <h3 className="text-xl font-black uppercase truncate">{alert.userName || "SECURE USER"}</h3>
                    <p className="text-[11px] font-bold text-slate-400 mb-6 uppercase"><Clock className="w-3 h-3 inline mr-1" />{alert.timestamp?.seconds ? new Date(alert.timestamp.seconds * 1000).toLocaleString() : "Pending"}</p>
                    
                    {alert.status === 'active' ? (
                      <div className="space-y-4">
                        <button onClick={() => window.open(`http://googleusercontent.com/maps.google.com/${alert.lat},${alert.lng}`, '_blank')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-red-600 transition-all shadow-lg">TRACK LOCATION</button>
                        <div className="flex gap-2">
                           <button onClick={() => markAsResolved(alert.id)} className="flex-1 py-4 border-2 border-slate-900 rounded-2xl font-black text-[10px] hover:bg-slate-900 hover:text-white transition-all">RESOLVE</button>
                           <button onClick={() => window.open(`https://wa.me/?text=🚨SOS: ${alert.userName} location: http://googleusercontent.com/maps.google.com/${alert.lat},${alert.lng}`, '_blank')} className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all"><MessageCircle className="w-6 h-6" /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-xs text-center border border-emerald-100 uppercase italic">Situation Resolved</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================
            SCREEN 2: PUSH BROADCAST
        ========================================= */}
        {activeTab === "push" && (
          <div className="animate-in fade-in slide-in-from-bottom duration-300 max-w-3xl">
            <header className="mb-12">
              <h2 className="text-4xl font-black uppercase italic tracking-tighter text-blue-600">Broadcast Center</h2>
              <p className="text-slate-400 text-xs font-bold uppercase mt-2">Global App Notifications</p>
            </header>

            <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-blue-50">
               <div className="flex items-center gap-5 mb-10">
                  <div className="bg-blue-600 p-5 rounded-2xl text-white shadow-xl shadow-blue-500/30"><Smartphone className="w-8 h-8" /></div>
                  <div>
                    <h3 className="text-2xl font-black uppercase italic">New Dispatch</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase">Send message to all apps</p>
                  </div>
               </div>
               <div className="space-y-8">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Headline</label>
                   <input type="text" placeholder="E.g. SYSTEM ALERT" value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} className="w-full p-6 bg-slate-50 border-2 rounded-3xl font-black text-lg focus:border-blue-600 outline-none" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Message Content</label>
                   <textarea placeholder="Enter instructions..." value={pushMessage} onChange={(e) => setPushMessage(e.target.value)} className="w-full p-6 bg-slate-50 border-2 rounded-3xl font-bold h-40 focus:border-blue-600 outline-none resize-none" />
                 </div>
                 <button onClick={handleSendPush} disabled={isSending} className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl font-black tracking-[0.2em] flex items-center justify-center gap-4 shadow-xl active:scale-95 transition-all disabled:opacity-50">
                   {isSending ? "DISPATCHING..." : "FIRE BROADCAST"} <Send className="w-6 h-6" />
                 </button>
               </div>
            </div>
          </div>
        )}

        {/* =========================================
            SCREEN 3: USER DATABASE
        ========================================= */}
        {activeTab === "users" && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
            <header className="mb-12 border-b border-slate-200 pb-8 flex justify-between items-end">
              <div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter text-purple-600">User Database</h2>
                <p className="text-slate-400 text-xs font-bold uppercase mt-2">Manage Registered Devices</p>
              </div>
              <div className="bg-white border-2 border-slate-100 px-6 py-3 rounded-2xl shadow-sm flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Users</span>
                <span className="text-2xl font-black text-purple-600">{usersList.length.toString().padStart(2, '0')}</span>
              </div>
            </header>

            {loadingUsers ? (
              <div className="font-black text-slate-300 animate-pulse uppercase text-center mt-20">Loading Database...</div>
            ) : (
              <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">User Details</th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Phone / Email</th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {usersList.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="p-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-black text-lg uppercase shadow-inner">
                                {user.name ? user.name.charAt(0) : "U"}
                              </div>
                              <div>
                                <h4 className="font-black text-slate-900 uppercase">{user.name || "Unknown User"}</h4>
                                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">ID: {user.id.slice(0, 8)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-6 font-bold text-slate-600 text-sm">
                            {user.phone || user.email || "N/A"}
                          </td>
                          <td className="p-6">
                            {user.expoPushToken ? (
                               <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">App Installed</span>
                            ) : (
                               <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest">No Device Token</span>
                            )}
                          </td>
                          <td className="p-6 text-right">
                            <button 
                              onClick={() => deleteUserRecord(user.id, user.name || "Unknown")}
                              className="p-3 bg-white border-2 border-slate-200 text-slate-400 rounded-xl hover:border-red-600 hover:text-red-600 hover:bg-red-50 transition-all"
                              title="Delete User"
                            >
                              <UserX className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {usersList.length === 0 && (
                        <tr>
                          <td colSpan="4" className="p-10 text-center font-black text-slate-300 uppercase tracking-widest">No users found in database</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}