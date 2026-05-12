"use client";
import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, MapPin, ShieldAlert, Clock, Trash2, ExternalLink,
  Shield, Activity, MessageCircle, Smartphone, Send, Users, UserX,
  History, Radio, BellRing
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
  
  // 🟢 MONITOR VIEW STATE (Live vs History)
  const [monitorView, setMonitorView] = useState("live"); // "live" | "history"

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

  const sendWhatsAppAlert = (alert) => {
    // 🌟 100000% VERIFIED MAP LINK
    const mapLink = `https://www.google.com/maps/search/?api=1&query=${alert.lat},${alert.lng}`;
    const message = `🚨 *URGENT SOS EMERGENCY* 🚨\n\n*Name:* ${alert.userName || "Unknown"}\n*Phone:* ${alert.phone || "N/A"}\n\nUser is in danger. Please track the live location below immediately:\n📍 ${mapLink}`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // ==========================================
  // 💬 FUNCTION: SEND DIRECT HELP MESSAGE
  // ==========================================
  const sendDirectMessage = async (alertData) => {
    if (!window.confirm(`Are you sure you want to send a 'Help is on the way' notification to "${alertData.userName || 'User'}"?`)) return;
    
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      let targetToken = null;
      
      usersSnap.forEach(u => {
        const uData = u.data();
        if ((uData.name === alertData.userName || uData.phone === alertData.phone || u.id === alertData.userId) && 
            (uData.pushToken || uData.expoPushToken)) {
          const token = uData.pushToken || uData.expoPushToken;
          if (String(token).includes("ExponentPushToken")) {
             targetToken = token;
          }
        }
      });

      if (!targetToken) {
        alert("❌ This user does not have a valid Device Token!");
        return;
      }

      const response = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          to: [targetToken], 
          sound: "default", 
          title: "🚨 HELP IS ON THE WAY!", 
          body: "We have received your emergency alert. Help is dispatched and on the way. Please stay calm and safe!" 
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) throw new Error("API Failed");
      
      alert(`✅ Message successfully sent to ${alertData.userName || 'User'}!`);

    } catch (error) {
      console.error("Direct Msg Error:", error);
      alert(`❌ Failed to send message: ${error.message}`);
    }
  };

  // ==========================================
  // 🚀 FUNCTION: SEND PUSH NOTIFICATION (ALL USERS)
  // ==========================================
  const handleSendPush = async () => {
    if (!pushTitle || !pushMessage) { alert("⚠️ Please enter Title and Message"); return; }
    setIsSending(true);
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      let tokens = [];
      
      usersSnap.forEach(u => { 
        const userToken = u.data().pushToken || u.data().expoPushToken;
        if (userToken && String(userToken).includes('ExponentPushToken')) {
          tokens.push(userToken); 
        }
      });

      if (tokens.length === 0) { 
        alert("❌ No VALID device tokens found!"); 
        setIsSending(false); 
        return; 
      }

      const response = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          to: tokens, 
          sound: "default", 
          title: pushTitle, 
          body: pushMessage 
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error("Local API Error: " + (result.error || "Request Failed"));
      }

      alert(`✅ Broadcast sent successfully to ${tokens.length} devices! 🚀`);
      setPushTitle(""); setPushMessage("");
    } catch (e) { 
      console.error("🔥 Push Error Details:", e);
      alert(`❌ Failed: ${e.message}`); 
    }
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
      fetchAllUsers(); 
    }
  };

  // ==========================================
  // 🗂️ DATA FILTERING (TODAY vs HISTORY)
  // ==========================================
  const activeCount = alerts.filter(a => a.status === 'active').length;
  
  const todayAlerts = alerts.filter(a => {
    if (!a.timestamp?.seconds) return true; 
    const alertDate = new Date(a.timestamp.seconds * 1000);
    const today = new Date();
    return alertDate.toDateString() === today.toDateString();
  });

  const historyAlerts = alerts.filter(a => {
    if (!a.timestamp?.seconds) return false;
    const alertDate = new Date(a.timestamp.seconds * 1000);
    const today = new Date();
    return alertDate.toDateString() !== today.toDateString();
  });

  const displayedAlerts = monitorView === "live" ? todayAlerts : historyAlerts;

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
          <button onClick={() => setActiveTab("monitor")} className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold transition-all ${activeTab === "monitor" ? "bg-red-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-900"}`}>
            <div className="flex items-center gap-3"><Activity className="w-5 h-5" /><span>Live Monitor</span></div>
            {activeCount > 0 && <span className="bg-white text-red-600 text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">LIVE</span>}
          </button>

          <button onClick={() => setActiveTab("push")} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === "push" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-900"}`}>
            <Smartphone className="w-5 h-5" /><span>Push Broadcast</span>
          </button>

          <button 
            onClick={() => { setActiveTab("users"); fetchAllUsers(); }} 
            className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === "users" ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-900"}`}
          >
            <Users className="w-5 h-5" /><span>User Database</span>
          </button>
        </nav>
      </aside>

      {/* 🔵 MAIN CONTENT AREA */}
      <main className="flex-1 ml-72 p-12">
        
        {/* =========================================
            SCREEN 1: LIVE MONITOR (TABLE FORMAT)
        ========================================= */}
        {activeTab === "monitor" && (
          <div className="animate-in fade-in slide-in-from-left duration-300">
            
            <header className="mb-10 flex justify-between items-end border-b border-slate-200 pb-8">
              <div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter">Emergency Monitor</h2>
                <p className="text-slate-400 text-xs font-bold uppercase mt-2">Active Surveillance Feed</p>
              </div>
              
              <div className="flex bg-slate-200/50 p-1 rounded-2xl">
                <button 
                  onClick={() => setMonitorView("live")} 
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${monitorView === "live" ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                >
                  <Radio className="w-4 h-4" /> Today&apos;s SOS
                </button>
                <button 
                  onClick={() => setMonitorView("history")} 
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${monitorView === "history" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                >
                  <History className="w-4 h-4" /> Past History
                </button>
              </div>
            </header>

            {loadingAlerts ? (
              <div className="font-black text-slate-300 animate-pulse uppercase text-center mt-20">Initializing Stream...</div>
            ) : (
              <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Victim Info</th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Time & Location</th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Emergency Actions</th>
                        <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedAlerts.map((alert) => (
                        <tr key={alert.id} className={`hover:bg-slate-50 transition-colors group ${alert.status === 'active' ? 'bg-red-50/20' : ''}`}>
                          
                          <td className="p-6">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white shadow-inner ${alert.status === 'active' ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`}>
                                <ShieldAlert className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-black text-slate-900 uppercase">{alert.userName || "SECURE USER"}</h4>
                                <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">{alert.phone || "No Phone"}</p>
                              </div>
                            </div>
                          </td>

                          <td className="p-6">
                            <p className="text-[11px] font-bold text-slate-600 flex items-center gap-2 mb-1">
                              <Clock className="w-3 h-3 text-slate-400" /> 
                              {alert.timestamp?.seconds ? new Date(alert.timestamp.seconds * 1000).toLocaleString() : "Pending"}
                            </p>
                            {/* 🌟 100000% VERIFIED MAP LINK FOR BUTTON */}
                            <button 
                              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${alert.lat},${alert.lng}`, '_blank')} 
                              className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md w-fit"
                            >
                              <MapPin className="w-3 h-3" /> Live Map
                            </button>
                          </td>

                          <td className="p-6">
                            {alert.status === 'active' ? (
                              <div className="flex items-center gap-2">
                                <button onClick={() => window.open('tel:100')} className="p-2.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-600 hover:text-white transition-all border border-blue-100" title="Call Police">
                                  <Shield className="w-5 h-5" />
                                </button>
                                <button onClick={() => window.open('tel:108')} className="p-2.5 bg-rose-50 text-rose-700 rounded-xl hover:bg-rose-600 hover:text-white transition-all border border-rose-100" title="Call Medical">
                                  <Activity className="w-5 h-5" />
                                </button>
                                <button onClick={() => sendWhatsAppAlert(alert)} className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100" title="WhatsApp Family">
                                  <MessageCircle className="w-5 h-5" />
                                </button>
                                <button onClick={() => sendDirectMessage(alert)} className="flex items-center gap-2 px-3 py-2.5 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-600 hover:text-white transition-all border border-purple-100" title="Send Help Notification">
                                  <BellRing className="w-5 h-5" />
                                  <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Notify</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 uppercase italic">Actions Locked</span>
                            )}
                          </td>

                          <td className="p-6 text-right flex items-center justify-end gap-3 h-full">
                            {alert.status === 'active' ? (
                              <button onClick={() => markAsResolved(alert.id)} className="px-5 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg">
                                Mark Resolved
                              </button>
                            ) : (
                              <span className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                Resolved
                              </span>
                            )}
                            <button onClick={() => deleteAlert(alert.id)} className="p-2 text-slate-300 hover:text-red-600 transition-colors" title="Delete Record">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>

                        </tr>
                      ))}
                      
                      {displayedAlerts.length === 0 && (
                        <tr>
                          <td colSpan="4" className="p-12 text-center">
                            <ShieldAlert className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="font-black text-slate-400 uppercase tracking-widest text-sm">No alerts found</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
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
                          <td className="p-6 font-bold text-slate-600 text-sm">{user.phone || user.email || "N/A"}</td>
                          <td className="p-6">
                            {(user.pushToken || user.expoPushToken) ? (
                               <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">App Installed</span>
                            ) : (
                               <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest">No Device Token</span>
                            )}
                          </td>
                          <td className="p-6 text-right">
                            <button onClick={() => deleteUserRecord(user.id, user.name || "Unknown")} className="p-3 bg-white border-2 border-slate-200 text-slate-400 rounded-xl hover:border-red-600 hover:text-red-600 hover:bg-red-50 transition-all">
                              <UserX className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
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