import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { seedDatabaseIfNeeded } from "./firebaseSeeder";
import { Entity, Report, PremiumPlanId } from "./types";
import { MetricCounter } from "./components/MetricCounter";
import { MainHeader } from "./components/MainHeader";
import { SearchModule } from "./components/SearchModule";
import { ReportModule } from "./components/ReportModule";
import { RightToReplyModule } from "./components/RightToReplyModule";
import { StatsModule } from "./components/StatsModule";
import { PremiumModule } from "./components/PremiumModule";
import { AdminModule } from "./components/AdminModule";
import {
  ShieldCheck,
  Building2,
  MapPin,
  Calendar,
  Star,
  CheckCircle2,
  Clock,
  ArrowLeft,
  AlertTriangle,
  FileSpreadsheet,
  Siren,
  FolderOpen,
  Sparkles,
  HelpCircle,
  RefreshCw,
  X,
  Settings,
  Check,
  Lock,
  CreditCard,
  Award,
  UserPlus,
  LogIn,
  Smartphone,
  Download,
  Share
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

export default function App() {
  const [activeTab, setActiveTab] = useState("search");
  const [currentUser, setCurrentUser] = useState<{ email: string; isPremium: boolean; plan: string } | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [associatedReports, setAssociatedReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Admin and Backdoor states
  const [isAdmin, setIsAdmin] = useState(() => {
    const isAdminVal = localStorage.getItem("rtc_is_admin") === "true";
    const isTokenVal = localStorage.getItem("rtc_admin_session") === "rtc_sec_token_v1_#Kalilinux22_active";
    return isAdminVal && isTokenVal;
  });
  const [backdoorActive, setBackdoorActive] = useState(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [backdoorToast, setBackdoorToast] = useState(false);

  // Security Sentinel States
  const [securityToast, setSecurityToast] = useState(false);
  const [securityToastMessage, setSecurityToastMessage] = useState("");

  // PWA (Progressive Web App) Installation States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosTutorial, setShowIosTutorial] = useState(false);

  // Register service worker and listen for PWA install events
  useEffect(() => {
    // Register Service Worker for offline and native app support
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("[PWA] Service Worker registrado con éxito en el ámbito:", reg.scope);
          })
          .catch((err) => {
            console.error("[PWA] Error de registro de Service Worker:", err);
          });
      });
    }

    // Detect if already installed (standalone mode)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    if (isStandalone) {
      localStorage.setItem("rtc_pwa_installed", "true");
    }

    // Detect if client is iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // If iOS and not installed standalone, offer custom instructions after 5s
    if (isIosDevice && !isStandalone && !localStorage.getItem("rtc_pwa_installed_dismissed")) {
      const timer = setTimeout(() => {
        setShowInstallBanner(true);
      }, 5000);
      return () => clearTimeout(timer);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // Store the event so it can be triggered later
      setDeferredPrompt(e);
      
      // If user hasn't dismissed it before and not standalone
      if (!isStandalone && !localStorage.getItem("rtc_pwa_installed_dismissed")) {
        setShowInstallBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
      localStorage.setItem("rtc_pwa_installed", "true");
      setSecurityToastMessage("📱 ¡RTC INSTALADA CON ÉXITO! Acceso directo creado en tu dispositivo.");
      setSecurityToast(true);
      setTimeout(() => setSecurityToast(false), 4000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosTutorial(true);
      return;
    }

    if (!deferredPrompt) {
      setSecurityToastMessage("ℹ️ Tu navegador ya tiene la app instalada o la opción está lista en la barra de direcciones.");
      setSecurityToast(true);
      setTimeout(() => setSecurityToast(false), 3000);
      return;
    }

    // Show the browser install prompt
    deferredPrompt.prompt();

    // Wait for choice
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      console.log("[PWA] El usuario aceptó la instalación de RTC");
      localStorage.setItem("rtc_pwa_installed", "true");
    } else {
      console.log("[PWA] El usuario rechazó la instalación");
    }

    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleDismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem("rtc_pwa_installed_dismissed", "true");
  };

  // Security Sentinel: DevTools & Right Click restrictions (Admin configured)
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (localStorage.getItem("rtc_disable_right_click") === "true") {
        e.preventDefault();
        setSecurityToastMessage("🛡️ ESCUDO DE PROTECCIÓN: Clic derecho e inspección de elementos restringidos por seguridad corporativa.");
        setSecurityToast(true);
        const timer = setTimeout(() => setSecurityToast(false), 3000);
        return () => clearTimeout(timer);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (localStorage.getItem("rtc_disable_devtools") === "true") {
        // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
        const isDevShortcut = 
          e.key === "F12" ||
          (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C" || e.key === "i" || e.key === "j" || e.key === "c")) ||
          (e.ctrlKey && (e.key === "U" || e.key === "u"));
          
        if (isDevShortcut) {
          e.preventDefault();
          setSecurityToastMessage("🛡️ ESCUDO DE PROTECCIÓN: Consola de desarrollo y visualización de código bloqueadas.");
          setSecurityToast(true);
          const timer = setTimeout(() => setSecurityToast(false), 3500);
          return () => clearTimeout(timer);
        }
      }
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Security Sentinel: Prevent client-side token or local storage injection
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "rtc_is_admin" && e.newValue === "true") {
        const sessionToken = localStorage.getItem("rtc_admin_session");
        if (sessionToken !== "rtc_sec_token_v1_#Kalilinux22_active") {
          // Detected potential manual local storage escalation attempt
          localStorage.clear();
          setIsAdmin(false);
          setSecurityToastMessage("🚨 ALERTA DE INTRUSIÓN: Intento de escalamiento de privilegios local detectado. Sesión bloqueada.");
          setSecurityToast(true);
          setTimeout(() => {
            setSecurityToast(false);
            window.location.reload();
          }, 3000);
        }
      }
    };

    // Periodically verify session integrity in the background
    const interval = setInterval(() => {
      const is_admin = localStorage.getItem("rtc_is_admin") === "true";
      const sessionToken = localStorage.getItem("rtc_admin_session");
      if (is_admin && sessionToken !== "rtc_sec_token_v1_#Kalilinux22_active") {
        localStorage.clear();
        setIsAdmin(false);
        setSecurityToastMessage("🚨 VIOLACIÓN DE INTEGRIDAD: Sesión inválida o alterada externamente.");
        setSecurityToast(true);
        setTimeout(() => {
          setSecurityToast(false);
          window.location.reload();
        }, 2500);
      }
    }, 1500);

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Global Platform Statistics Counters
  const [globalStats, setGlobalStats] = useState({
    totalReports: 41,
    verifiedEntities: 4,
    responseRate: 78,
    casesInProsecution: 7
  });

  // Listen for F1+Shift+M when backdoor click sequence is completed
  useEffect(() => {
    if (!backdoorActive) return;

    // Show a temporary visual indication (toast) that backdoor is armed and waiting
    setBackdoorToast(true);
    const toastTimer = setTimeout(() => {
      setBackdoorToast(false);
      setBackdoorActive(false); // timeout backdoor arming after 15 seconds
    }, 15000);

    const activeKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
      }
      activeKeys.add(e.key.toLowerCase());

      const hasF1 = activeKeys.has("f1");
      const hasM = activeKeys.has("m");

      if (hasF1 && hasM && e.shiftKey) {
        e.preventDefault();
        setShowAdminLoginModal(true);
        setBackdoorActive(false);
        setBackdoorToast(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys.delete(e.key.toLowerCase());
    };

    const handleBlur = () => {
      activeKeys.clear();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      clearTimeout(toastTimer);
    };
  }, [backdoorActive]);

  // Simple login modal state for demo/testing
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [modalTab, setModalTab] = useState<"login" | "register">("login");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPlan, setRegisterPlan] = useState<"free" | "ciudadano" | "periodista" | "empresa" | "municipio">("free");
  const [registerCycle, setRegisterCycle] = useState<"mensual" | "semestral" | "anual">("mensual");
  const [registerPaymentMethod, setRegisterPaymentMethod] = useState<"flow" | "stripe" | "mercadopago">("flow");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [registerProcessing, setRegisterProcessing] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  // Run database seed check on startup
  useEffect(() => {
    const initDatabase = async () => {
      await seedDatabaseIfNeeded();
    };
    initDatabase();
  }, []);

  // Set up listeners for real-time global statistics count
  useEffect(() => {
    // Listen to entities count
    const unsubscribeEntities = onSnapshot(collection(db, "entities"), (snap) => {
      let resolvedCount = 0;
      let totalCount = 0;
      snap.forEach((doc) => {
        const d = doc.data();
        resolvedCount += d.resolvedReports || 0;
        totalCount += d.totalReports || 0;
      });

      setGlobalStats(prev => ({
        ...prev,
        verifiedEntities: snap.size,
        responseRate: totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 78
      }));
    });

    // Listen to reports count
    const unsubscribeReports = onSnapshot(collection(db, "reports"), (snap) => {
      let fiscaliaCount = 0;
      snap.forEach((doc) => {
        const d = doc.data();
        if (d.status === "denunciado_fiscalia") {
          fiscaliaCount++;
        }
      });

      setGlobalStats(prev => ({
        ...prev,
        totalReports: snap.size,
        casesInProsecution: fiscaliaCount || 7
      }));
    });

    return () => {
      unsubscribeEntities();
      unsubscribeReports();
    };
  }, []);

  // Fetch associated reports for the selected entity in real time
  useEffect(() => {
    if (!selectedEntity) {
      setAssociatedReports([]);
      return;
    }

    setLoadingReports(true);
    const q = query(
      collection(db, "reports"),
      where("entityId", "==", selectedEntity.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Report[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Report;
        if (data.status !== "rechazado") {
          list.push({ id: doc.id, ...data });
        }
      });
      setAssociatedReports(list);
      setLoadingReports(false);
    }, (error) => {
      console.error("Error fetching associated reports:", error);
      setLoadingReports(false);
    });

    return () => unsubscribe();
  }, [selectedEntity]);

  // Handle Demo Login
  const handleDemoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) return;

    // Check if user has premium profile in Firestore
    try {
      const userRef = doc(db, "premium_status", loginEmail);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setCurrentUser({
          email: loginEmail,
          isPremium: data.status === "active",
          plan: data.planId
        });
      } else {
        // Create new free user
        setCurrentUser({
          email: loginEmail,
          isPremium: false,
          plan: "free"
        });
      }
    } catch (err) {
      console.error(err);
      setCurrentUser({
        email: loginEmail,
        isPremium: false,
        plan: "free"
      });
    }

    setShowLoginModal(false);
  };

  // Handle Demo Register with optional premium activation & simulation
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerEmail.trim()) return;

    setRegisterProcessing(true);

    try {
      if (registerPlan === "free") {
        // Create/Update free user in premium_status with 'inactive' or just set state
        const userRef = doc(db, "premium_status", registerEmail);
        await setDoc(userRef, {
          email: registerEmail,
          planId: "free",
          status: "inactive",
          createdAt: new Date().toISOString()
        });

        setCurrentUser({
          email: registerEmail,
          isPremium: false,
          plan: "free"
        });
        
        setRegisterSuccess(true);
        setTimeout(() => {
          setRegisterSuccess(false);
          setShowLoginModal(false);
          // Reset states
          setRegisterEmail("");
          setRegisterPlan("free");
        }, 1500);
      } else {
        // Paid Plan registration
        const planPrice = 
          registerPlan === "ciudadano" ? 3990 : 
          registerPlan === "periodista" ? 9990 : 
          registerPlan === "empresa" ? 19990 : 
          registerPlan === "municipio" ? 49990 : 0;

        let finalPrice = planPrice;
        if (registerCycle === "semestral") {
          finalPrice = Math.round(planPrice * 6 * 0.85);
        } else if (registerCycle === "anual") {
          finalPrice = Math.round(planPrice * 12 * 0.75);
        }

        const transactionId = `FLOW-${registerPaymentMethod.toUpperCase()}-${Math.floor(Math.random() * 900000 + 100000)}`;

        // Save to Firestore premium_status
        const userRef = doc(db, "premium_status", registerEmail);
        await setDoc(userRef, {
          email: registerEmail,
          planId: registerPlan,
          status: "active",
          billingCycle: registerCycle,
          transactionId: transactionId,
          amountPaid: finalPrice,
          paymentMethod: registerPaymentMethod,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        });

        setCurrentUser({
          email: registerEmail,
          isPremium: true,
          plan: registerPlan
        });

        setRegisterSuccess(true);
        setTimeout(() => {
          setRegisterSuccess(false);
          setShowLoginModal(false);
          // Reset states
          setRegisterEmail("");
          setRegisterPlan("free");
          setCardName("");
          setCardNumber("");
          setCardExpiry("");
          setCardCvv("");
        }, 2000);
      }
    } catch (err) {
      console.error("Error during register:", err);
      // Fallback local registration
      setCurrentUser({
        email: registerEmail,
        isPremium: registerPlan !== "free",
        plan: registerPlan
      });
      setRegisterSuccess(true);
      setTimeout(() => {
        setRegisterSuccess(false);
        setShowLoginModal(false);
        setRegisterEmail("");
      }, 1500);
    } finally {
      setRegisterProcessing(false);
    }
  };

  // Handle premium upgrade
  const handleUpgradeSuccess = async (planId: PremiumPlanId, cycle: "mensual" | "semestral" | "anual", transactionId: string) => {
    if (!currentUser) return;

    try {
      // Save premium profile to Firestore
      const userRef = doc(db, "premium_status", currentUser.email);
      await setDoc(userRef, {
        email: currentUser.email,
        planId,
        status: "active",
        billingCycle: cycle,
        transactionId,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });

      setCurrentUser({
        email: currentUser.email,
        isPremium: true,
        plan: planId
      });
    } catch (err) {
      console.error("Error saving premium status:", err);
      // Fallback local upgrade
      setCurrentUser({
        email: currentUser.email,
        isPremium: true,
        plan: planId
      });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  // Mock data for evolution chart in dossiers (represented as physical oscilloscope grids)
  const evolutionData = [
    { name: "Ene", Reportes: 2, Solucionados: 1 },
    { name: "Feb", Reportes: 5, Solucionados: 3 },
    { name: "Mar", Reportes: 8, Solucionados: 4 },
    { name: "Abr", Reportes: 10, Solucionados: 6 },
    { name: "May", Reportes: 12, Solucionados: 7 },
    { name: "Jun", Reportes: 15, Solucionados: 10 },
  ];

  return (
    <div className="min-h-screen bg-slate-200/60 py-8 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-800 selection:bg-orange-500 selection:text-white">
      {/* Outer grid boundaries */}
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        
        {/* Metric Counters Grid - Physical Tactile Interface */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <MetricCounter
            value={globalStats.totalReports}
            label="Reportes Ciudadanos"
            sublabel="Base de datos real"
            color="orange"
          />
          <MetricCounter
            value={globalStats.verifiedEntities}
            label="Entidades Registradas"
            sublabel="Empresas, Municipios, Org"
            color="blue"
          />
          <MetricCounter
            value={globalStats.responseRate}
            label="Tasa de Respuesta"
            sublabel="Derecho a réplica"
            color="green"
          />
          <MetricCounter
            value={globalStats.casesInProsecution}
            label="Querellas en Fiscalía"
            sublabel="Derivación penal"
            color="orange"
          />
        </section>

        {/* Platform Core Header Nav Console */}
        <MainHeader
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setSelectedEntity(null); // Clear selected dossier when navigation changes
          }}
          currentUser={currentUser}
          onLogout={handleLogout}
          onLoginClick={() => setShowLoginModal(true)}
          isAdmin={isAdmin}
          onBackdoorTriggered={() => setBackdoorActive(true)}
        />

        {/* Core Screen Router */}
        <main className="w-full">
          {selectedEntity ? (
            /* Immersive Dossier Detail View */
            <div className="w-full bg-slate-100 rounded-3xl p-6 border border-slate-200/90 shadow-[8px_8px_16px_#cbd0da,-8px_-8px_16px_#ffffff] relative overflow-hidden animate-fade-in">
              <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-slate-300 border border-slate-400/40 shadow-inner"></div>
              <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-slate-300 border border-slate-400/40 shadow-inner"></div>

              {/* Dossier Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 mb-6">
                <button
                  onClick={() => setSelectedEntity(null)}
                  className="flex items-center gap-2 text-xs font-mono tracking-wider font-bold uppercase py-2 px-4 rounded-xl border border-slate-300 bg-slate-100 text-slate-600 shadow-[4px_4px_8px_#cbd5e1,-4px_-4px_8px_#ffffff] hover:text-orange-600 active:shadow-inner transition-colors w-fit"
                >
                  <ArrowLeft className="w-4 h-4 text-orange-500" />
                  Volver al Buscador
                </button>

                <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400 uppercase">
                  <span>EXPEDIENTE: RTC-{selectedEntity.id.toUpperCase()}</span>
                  <span>•</span>
                  <span>ESTADO: VERIFICADO</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left dossier panel: Entity Metadata Card */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                  <div className="bg-slate-200/40 rounded-2xl p-4.5 border border-slate-200 shadow-inner">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 rounded-xl bg-slate-900 text-orange-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-sans font-extrabold text-slate-800 tracking-tight leading-snug">
                          {selectedEntity.name}
                        </h3>
                        {selectedEntity.rut && (
                          <span className="text-[10px] font-mono text-slate-500">RUT: {selectedEntity.rut}</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2.5 text-xs text-slate-600 font-sans border-t border-slate-200 pt-3">
                      <div className="flex justify-between">
                        <span className="text-[10px] font-mono uppercase text-slate-400">Categoría</span>
                        <span className="font-semibold text-slate-700">{selectedEntity.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[10px] font-mono uppercase text-slate-400">Ubicación</span>
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> {selectedEntity.comuna}, {selectedEntity.region}
                        </span>
                      </div>
                      {selectedEntity.domain && (
                        <div className="flex justify-between">
                          <span className="text-[10px] font-mono uppercase text-slate-400">Dominio Web</span>
                          <span className="font-mono text-[11px] text-orange-600 font-semibold">{selectedEntity.domain}</span>
                        </div>
                      )}
                      {selectedEntity.email && (
                        <div className="flex justify-between">
                          <span className="text-[10px] font-mono uppercase text-slate-400">Soporte Público</span>
                          <span className="font-mono text-[11px] text-slate-700">{selectedEntity.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quality & Evidence Indicators */}
                  <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200/80 shadow-[4px_4px_8px_#cfd2d9,-4px_-4px_8px_#ffffff]">
                    <span className="text-[9px] font-mono uppercase text-slate-500 block mb-1">Nivel de Evidencia Acumulada</span>
                    <div className="flex items-center gap-1 mb-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.round(selectedEntity.evidenceLevel)
                              ? "text-orange-500 fill-orange-500/80"
                              : "text-slate-300"
                          }`}
                        />
                      ))}
                      <span className="text-xs font-mono font-bold text-slate-700 ml-1">
                        {selectedEntity.evidenceLevel.toFixed(1)} / 5.0
                      </span>
                    </div>

                    <div className="space-y-3 font-sans text-xs">
                      <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5">
                        <span className="text-slate-500">Reportes totales</span>
                        <span className="font-mono font-bold text-slate-800">{associatedReports.length}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5">
                        <span className="text-slate-500">Réplicas Oficiales</span>
                        <span className="font-mono font-bold text-emerald-600">
                          {associatedReports.filter(r => r.officialResponse).length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Tiempo de respuesta</span>
                        <span className="font-mono font-bold text-slate-800 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> ~{selectedEntity.avgResponseTime} días
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right dossier panel: Evolution oscilloscope chart & Reports timeline */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                  
                  {/* Scope Chart: evolution of complaints */}
                  <div className="bg-slate-100 rounded-2xl p-4.5 border border-slate-200/80 shadow-[4px_4px_8px_#cfd2d9,-4px_-4px_8px_#ffffff]">
                    <h4 className="text-xs font-mono font-bold uppercase text-slate-600 mb-3 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-orange-500" />
                      Historial & Evolución de Reportes
                    </h4>
                    <div className="h-[140px] w-full bg-slate-900 rounded-xl p-2 border border-slate-950 relative overflow-hidden">
                      {/* Grid schematic overlay */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none"></div>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={evolutionData}>
                          <XAxis dataKey="name" stroke="#475569" fontSize={8} tickLine={false} />
                          <Tooltip contentStyle={{ background: "#0f172a", border: "none", borderRadius: "8px", fontSize: "10px", color: "#f8fafc" }} />
                          <Area type="monotone" dataKey="Reportes" stroke="#f97316" fill="rgba(249,115,22,0.1)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Citizen complaints timeline */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-mono font-bold uppercase text-slate-600 flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-orange-500" />
                      Historial de Denuncias Acreditadas
                    </h4>

                    {loadingReports ? (
                      <div className="flex items-center justify-center p-8 bg-slate-200/30 rounded-xl">
                        <RefreshCw className="w-5 h-5 animate-spin text-orange-500 mr-2" />
                        <span className="text-xs font-mono text-slate-500">Compilando expedientes...</span>
                      </div>
                    ) : associatedReports.length === 0 ? (
                      <div className="p-8 border-2 border-dashed border-slate-300 rounded-2xl text-center text-slate-400 bg-slate-50/50">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500/20 mx-auto mb-2" />
                        <span className="text-xs font-mono uppercase font-bold text-slate-500">Sin denuncias activas</span>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto font-sans">
                          Esta entidad no cuenta con denuncias ciudadanas vigentes ni reportes pendientes de moderación.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {associatedReports.map((report) => (
                          <div
                            key={report.id}
                            className="bg-slate-100 rounded-2xl p-4 border border-slate-200/80 shadow-[4px_4px_8px_#cfd2d9,-4px_-4px_8px_#ffffff] flex flex-col gap-3 relative"
                          >
                            <div className="flex justify-between items-start gap-2 border-b border-slate-200/60 pb-2">
                              <div>
                                <span className="text-[9px] font-mono text-orange-600 bg-orange-500/10 py-0.5 px-2 rounded-full uppercase font-bold">
                                  {report.category}
                                </span>
                                <h5 className="text-xs font-extrabold text-slate-800 font-sans mt-1.5">{report.title}</h5>
                              </div>
                              
                              <div className="flex flex-col items-end shrink-0">
                                <span className={`text-[8px] font-mono py-0.5 px-1.5 border rounded-full uppercase font-bold ${
                                  report.status === "denunciado_fiscalia"
                                    ? "bg-red-500/10 text-red-600 border-red-300 shadow-[0_0_6px_rgba(239,68,68,0.1)]"
                                    : "bg-emerald-500/10 text-emerald-600 border-emerald-300"
                                }`}>
                                  {report.status === "denunciado_fiscalia" ? "Querella Fiscalía" : "Publicado"}
                                </span>
                                <span className="text-[8px] text-slate-400 font-mono mt-1">
                                  {new Date(report.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed font-sans italic">
                              "{report.description}"
                            </p>

                            {/* Official right-to-reply response box */}
                            {report.officialResponse ? (
                              <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/20 mt-1">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[9px] font-mono text-emerald-700 font-extrabold uppercase flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    Réplica Oficial Acreditada
                                  </span>
                                  <span className="text-[8px] font-mono text-slate-400">
                                    {new Date(report.officialResponse.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-700 font-sans leading-relaxed">
                                  "{report.officialResponse.responseText}"
                                </p>
                                <span className="text-[9px] text-emerald-600 font-mono block mt-1">
                                  Firmado por: {report.officialResponse.responderName}
                                </span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 italic flex items-center gap-1.5 mt-1">
                                <Clock className="w-3.5 h-3.5 text-slate-300" />
                                Pendiente de respuesta oficial por el afectado.
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          ) : (
            /* Active Module Route */
            <>
              {activeTab === "search" && (
                <SearchModule onSelectEntity={(entity) => setSelectedEntity(entity)} />
              )}
              {activeTab === "report" && (
                <ReportModule
                  currentUser={currentUser}
                  onSuccess={() => setActiveTab("search")}
                />
              )}
              {activeTab === "reply" && <RightToReplyModule />}
              {activeTab === "stats" && <StatsModule />}
              {activeTab === "premium" && (
                <PremiumModule
                  currentUser={currentUser}
                  onUpgradeSuccess={handleUpgradeSuccess}
                  onLoginClick={() => setShowLoginModal(true)}
                />
              )}
              {activeTab === "admin" && (
                <AdminModule
                  onAdminLogout={() => {
                    setIsAdmin(false);
                    localStorage.removeItem("rtc_is_admin");
                    localStorage.removeItem("rtc_admin_session");
                    setActiveTab("search");
                  }}
                />
              )}
            </>
          )}
        </main>

        {/* Chile Transparency Footer */}
        <footer className="w-full text-center py-6 border-t border-slate-300/80 font-mono text-[10px] text-slate-500 uppercase tracking-widest mt-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <span>© 2026 Red de Transparencia Ciudadana • CHILE</span>
          
          {/* Permanent PWA install button in footer */}
          <button
            type="button"
            onClick={() => {
              setShowInstallBanner(true);
              if (isIOS) {
                setShowIosTutorial(true);
              } else if (deferredPrompt) {
                handleInstallClick();
              } else {
                setSecurityToastMessage("ℹ️ Tu navegador ya tiene la app instalada o la opción está disponible en tu navegador.");
                setSecurityToast(true);
                setTimeout(() => setSecurityToast(false), 3000);
              }
            }}
            className="flex items-center gap-1.5 text-[9px] font-bold text-orange-600 hover:text-orange-500 bg-orange-500/5 hover:bg-orange-500/10 border border-orange-200/50 hover:border-orange-300 rounded-xl px-3.5 py-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Descargar Aplicación Móvil / PC
          </button>

          <span>COMPATIBLE CON VERCEL & FIREBASE DEPLOYMENT</span>
        </footer>

      </div>

      {/* Demo Sign In Modal Dialogue with Registration and Premium checkout */}
      {showLoginModal && (
        <div 
          onClick={() => {
            if (!registerProcessing) {
              setShowLoginModal(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 cursor-pointer overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-100 rounded-3xl p-6 border border-slate-300 max-w-md w-full shadow-2xl relative cursor-default my-8"
          >
            {/* Absolute close button ("X") */}
            <button
              type="button"
              disabled={registerProcessing}
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 p-1.5 rounded-full transition-all flex items-center justify-center disabled:opacity-50"
              aria-label="Cerrar"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 mb-5 w-full">
              <button
                type="button"
                onClick={() => setModalTab("login")}
                className={`flex-1 pb-2.5 font-mono text-xs uppercase font-extrabold border-b-2 transition-all cursor-pointer ${
                  modalTab === "login"
                    ? "border-orange-500 text-slate-800"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Ingresar
              </button>
              <button
                type="button"
                onClick={() => setModalTab("register")}
                className={`flex-1 pb-2.5 font-mono text-xs uppercase font-extrabold border-b-2 transition-all cursor-pointer ${
                  modalTab === "register"
                    ? "border-orange-500 text-slate-800"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Crear Cuenta
              </button>
            </div>

            {registerSuccess ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600 mb-4 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <Check className="w-8 h-8 animate-bounce" />
                </div>
                <h3 className="text-base font-sans font-extrabold text-slate-800 uppercase tracking-tight">
                  ¡Operación Exitosa!
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-1 uppercase">
                  {registerPlan === "free" ? "Cuenta Creada Correctamente" : "Pago Simulado & Cuenta Premium Activada"}
                </p>
                <p className="text-[11px] text-slate-400 mt-3 font-sans">
                  Sincronizando sesión con Firestore en tiempo real...
                </p>
              </div>
            ) : modalTab === "login" ? (
              /* TAB: LOGIN */
              <div className="flex flex-col">
                <div className="flex flex-col items-center mb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-orange-500/40 flex items-center justify-center text-orange-500 mb-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
                    <ShieldCheck className="w-6 h-6 animate-pulse" />
                  </div>
                  <h3 className="text-sm font-sans font-extrabold text-slate-800 uppercase tracking-tight">Acceder a la Red</h3>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase">Sincronización de Identidad Ciudadana</p>
                </div>

                {/* Benefits List */}
                <div className="mb-4 bg-slate-200/50 rounded-2xl p-3 border border-slate-200 flex flex-col gap-2">
                  <span className="text-[9px] font-mono uppercase text-slate-500 font-extrabold">Beneficios de tu Cuenta:</span>
                  <div className="flex gap-2 items-start">
                    <Check className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[10.5px] font-sans font-bold text-slate-700">Monitoreo de Reportes</span>
                      <span className="text-[9px] text-slate-500">Historial completo con las respuestas oficiales de las entidades afectadas.</span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-start">
                    <Check className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[10.5px] font-sans font-bold text-slate-700">Canal de Alertas</span>
                      <span className="text-[9px] text-slate-500">Recibe notificaciones inmediatas si tus reportes avanzan a querellas.</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleDemoLogin} className="w-full flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-mono uppercase text-slate-500 font-bold">Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Ej. mi.nombre@gmail.com"
                      className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-700 shadow-inner focus:outline-none focus:ring-1 focus:ring-orange-500 font-sans"
                    />
                  </div>

                  <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20 text-[10px] text-slate-500 leading-relaxed font-sans">
                    <strong>Acceso Directo:</strong> Ingresa tu correo habitual. Si ya cuentas con suscripción Premium, tu sesión se sincronizará automáticamente desde Firebase.
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowLoginModal(false)}
                      className="w-1/2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-mono text-xs font-bold uppercase py-3 rounded-xl border border-slate-300/80 shadow-sm transition-all text-center cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold uppercase py-3 rounded-xl shadow-md transition-all text-center cursor-pointer"
                    >
                      Ingresar
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* TAB: REGISTER / CREATE ACCOUNT */
              <div className="flex flex-col max-h-[80vh] overflow-y-auto pr-1">
                <div className="flex flex-col items-center mb-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-900 border border-orange-500/40 flex items-center justify-center text-orange-500 mb-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
                    <UserPlus className="w-5 h-5 animate-pulse" />
                  </div>
                  <h3 className="text-sm font-sans font-extrabold text-slate-800 uppercase tracking-tight">Registro de Ciudadano</h3>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase">Crea tu Identidad & Elige tus Beneficios</p>
                </div>

                <form onSubmit={handleRegister} className="w-full flex flex-col gap-3">
                  {/* Step 1: Email */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-mono uppercase text-slate-500 font-bold">Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder="Ej. mi.nombre@gmail.com"
                      className="bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-700 shadow-inner focus:outline-none focus:ring-1 focus:ring-orange-500 font-sans"
                    />
                  </div>

                  {/* Step 2: Plan Selection */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-mono uppercase text-slate-500 font-bold">Tipo de Cuenta / Beneficios</label>
                    <div className="grid grid-cols-1 gap-2">
                      {/* Plan Free */}
                      <div 
                        onClick={() => setRegisterPlan("free")}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${
                          registerPlan === "free" 
                            ? "bg-slate-200 border-slate-400 shadow-sm" 
                            : "bg-slate-50 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-[11px] font-sans font-bold text-slate-800">Cuenta Básica (Gratuita)</span>
                          <span className="text-[9px] text-slate-500">Reportes públicos, consultas básicas.</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-300/40 py-0.5 px-2 rounded-full uppercase">0 CLP</span>
                      </div>

                      {/* Plan Ciudadano */}
                      <div 
                        onClick={() => setRegisterPlan("ciudadano")}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${
                          registerPlan === "ciudadano" 
                            ? "bg-orange-500/10 border-orange-400 shadow-sm" 
                            : "bg-slate-50 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-[11px] font-sans font-bold text-slate-800 flex items-center gap-1">
                            Plan Ciudadano Premium
                            <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          </span>
                          <span className="text-[9px] text-slate-500">Alertas automáticas, descargas PDF de incidentes.</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-orange-700 bg-orange-500/15 py-0.5 px-2 rounded-full uppercase">$3.990 CLP</span>
                      </div>

                      {/* Plan Periodista */}
                      <div 
                        onClick={() => setRegisterPlan("periodista")}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${
                          registerPlan === "periodista" 
                            ? "bg-emerald-500/10 border-emerald-400 shadow-sm" 
                            : "bg-slate-50 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-[11px] font-sans font-bold text-slate-800 flex items-center gap-1">
                            Plan Periodista Premium
                            <Award className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          </span>
                          <span className="text-[9px] text-slate-500">Bases de datos completas, gráficos avanzados.</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-500/15 py-0.5 px-2 rounded-full uppercase">$9.990 CLP</span>
                      </div>

                      {/* Plan Empresa */}
                      <div 
                        onClick={() => setRegisterPlan("empresa")}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${
                          registerPlan === "empresa" 
                            ? "bg-sky-500/10 border-sky-400 shadow-sm" 
                            : "bg-slate-50 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-[11px] font-sans font-bold text-slate-800 flex items-center gap-1">
                            Plan Empresa Premium
                            <Award className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                          </span>
                          <span className="text-[9px] text-slate-500">Réplica oficial corporativa, alertas de RUT y resolución de reputación.</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-sky-700 bg-sky-500/15 py-0.5 px-2 rounded-full uppercase">$19.990 CLP</span>
                      </div>

                      {/* Plan Municipio */}
                      <div 
                        onClick={() => setRegisterPlan("municipio")}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${
                          registerPlan === "municipio" 
                            ? "bg-purple-500/10 border-purple-400 shadow-sm" 
                            : "bg-slate-50 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-[11px] font-sans font-bold text-slate-800 flex items-center gap-1">
                            Plan Municipio Premium
                            <Award className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          </span>
                          <span className="text-[9px] text-slate-500">Panel institucional de comuna, mapa vecinal interactivo.</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-500/15 py-0.5 px-2 rounded-full uppercase">$49.990 CLP</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Paid Subscription checkout details */}
                  {registerPlan !== "free" && (
                    <div className="bg-slate-200/55 p-3 rounded-2xl border border-slate-300/70 flex flex-col gap-2.5 mt-1">
                      <div className="flex justify-between items-center border-b border-slate-300/50 pb-2">
                        <span className="text-[10px] font-sans font-bold text-slate-700 uppercase flex items-center gap-1">
                          <CreditCard className="w-4 h-4 text-orange-500" />
                          Pasarela Segura Integrada
                        </span>
                        
                        <div className="flex gap-1">
                          <span className="text-[8px] font-mono py-0.5 px-1.5 rounded bg-emerald-500/10 text-emerald-700 font-extrabold">FLOW CHILE</span>
                          <span className="text-[8px] font-mono py-0.5 px-1.5 rounded bg-sky-500/10 text-sky-700 font-extrabold">SECURE</span>
                        </div>
                      </div>

                      {/* Cycle Selector */}
                      <div className="flex gap-2 items-center justify-between">
                        <span className="text-[9px] font-mono uppercase text-slate-500 font-bold">Ciclo de Facturación:</span>
                        <div className="flex bg-slate-300/40 p-0.5 rounded-lg border border-slate-300">
                          <button
                            type="button"
                            onClick={() => setRegisterCycle("mensual")}
                            className={`text-[8px] font-mono py-1 px-2.5 rounded uppercase font-bold transition-all cursor-pointer ${
                              registerCycle === "mensual" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            Mensual
                          </button>
                          <button
                            type="button"
                            onClick={() => setRegisterCycle("semestral")}
                            className={`text-[8px] font-mono py-1 px-2.5 rounded uppercase font-bold transition-all cursor-pointer ${
                              registerCycle === "semestral" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            Semestral
                          </button>
                          <button
                            type="button"
                            onClick={() => setRegisterCycle("anual")}
                            className={`text-[8px] font-mono py-1 px-2.5 rounded uppercase font-bold transition-all cursor-pointer ${
                              registerCycle === "anual" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            Anual
                          </button>
                        </div>
                      </div>

                      {/* Simulated Card Form inputs */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-0.5 col-span-2">
                          <label className="text-[8px] font-mono uppercase text-slate-500 font-bold">Titular de la Tarjeta</label>
                          <input
                            type="text"
                            required={registerPlan !== "free"}
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            placeholder="Nombre y Apellido"
                            className="bg-slate-50 border border-slate-300 rounded-lg p-2 text-[11px] text-slate-700 shadow-inner focus:outline-none focus:ring-1 focus:ring-orange-500 font-sans"
                          />
                        </div>
                        <div className="flex flex-col gap-0.5 col-span-2">
                          <label className="text-[8px] font-mono uppercase text-slate-500 font-bold">Número de Tarjeta (Ficticio)</label>
                          <input
                            type="text"
                            required={registerPlan !== "free"}
                            maxLength={19}
                            value={cardNumber}
                            onChange={(e) => {
                              // Auto format card number spaces
                              const v = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
                              const matches = v.match(/\d{4,16}/g);
                              const match = (matches && matches[0]) || "";
                              const parts = [];
                              for (let i = 0, len = match.length; i < len; i += 4) {
                                parts.push(match.substring(i, i + 4));
                              }
                              if (parts.length > 0) {
                                setCardNumber(parts.join(" "));
                              } else {
                                setCardNumber(v);
                              }
                            }}
                            placeholder="4658 9200 1145 8012"
                            className="bg-slate-50 border border-slate-300 rounded-lg p-2 text-[11px] text-slate-700 shadow-inner focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                          />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[8px] font-mono uppercase text-slate-500 font-bold">Vencimiento</label>
                          <input
                            type="text"
                            required={registerPlan !== "free"}
                            maxLength={5}
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="MM/AA"
                            className="bg-slate-50 border border-slate-300 rounded-lg p-2 text-[11px] text-slate-700 shadow-inner focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono text-center"
                          />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[8px] font-mono uppercase text-slate-500 font-bold">CVV</label>
                          <input
                            type="password"
                            required={registerPlan !== "free"}
                            maxLength={3}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder="•••"
                            className="bg-slate-50 border border-slate-300 rounded-lg p-2 text-[11px] text-slate-700 shadow-inner focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono text-center"
                          />
                        </div>
                      </div>

                      {/* Total and security message */}
                      <div className="flex justify-between items-center border-t border-slate-300/50 pt-2 text-[11px]">
                        <span className="font-sans font-bold text-slate-600">Total a pagar simulado:</span>
                        <span className="font-mono font-extrabold text-orange-600 bg-orange-500/5 border border-orange-500/10 py-0.5 px-2.5 rounded-full">
                          {(() => {
                            const base = 
                              registerPlan === "ciudadano" ? 3990 : 
                              registerPlan === "periodista" ? 9990 : 
                              registerPlan === "empresa" ? 19990 : 
                              registerPlan === "municipio" ? 49990 : 0;
                            
                            let total = base;
                            if (registerCycle === "semestral") {
                              total = Math.round(base * 6 * 0.85);
                            } else if (registerCycle === "anual") {
                              total = Math.round(base * 12 * 0.75);
                            }
                            
                            const suffix = 
                              registerCycle === "mensual" ? " / mes" :
                              registerCycle === "semestral" ? " / 6 meses" :
                              " / año";
                            
                            return `CLP $${total.toLocaleString("es-CL")}${suffix}`;
                          })()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Form Submission Buttons */}
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      disabled={registerProcessing}
                      onClick={() => setShowLoginModal(false)}
                      className="w-1/3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-mono text-xs font-bold uppercase py-3 rounded-xl border border-slate-300/80 shadow-sm transition-all text-center cursor-pointer disabled:opacity-55"
                    >
                      Atrás
                    </button>
                    <button
                      type="submit"
                      disabled={registerProcessing}
                      className="w-2/3 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold uppercase py-3 rounded-xl shadow-md transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-55"
                    >
                      {registerProcessing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Procesando...
                        </>
                      ) : registerPlan === "free" ? (
                        "Registrar Gratis"
                      ) : (
                        "Registrar & Pagar"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdoor Armed Floating Notification */}
      {backdoorToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-purple-500 text-purple-200 px-4 py-3 rounded-2xl shadow-[0_4px_20px_rgba(124,58,237,0.4)] animate-pulse flex items-center gap-3 font-mono text-[10px]">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping"></div>
          <div className="flex flex-col">
            <span className="font-extrabold uppercase">MODO BACKDOOR ACTIVADO</span>
            <span className="text-slate-400">Presione F1 + Shift + m para autenticar...</span>
          </div>
        </div>
      )}

      {/* Secret Admin Authentication Modal */}
      {showAdminLoginModal && (
        <div 
          onClick={() => setShowAdminLoginModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-purple-500/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative text-slate-100 cursor-default"
          >
            {/* Absolute close button */}
            <button
              type="button"
              onClick={() => setShowAdminLoginModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 hover:bg-slate-800 p-1.5 rounded-full transition-all flex items-center justify-center"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-purple-950 border border-purple-500/40 flex items-center justify-center text-purple-400 mb-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
                <Settings className="w-6 h-6 animate-spin-slow" />
              </div>
              <h3 className="text-sm font-sans font-extrabold text-white uppercase tracking-wider">Acceso de Super Administrador</h3>
              <p className="text-[9px] text-purple-400 font-mono mt-0.5 uppercase tracking-widest">Backdoor RTC Desencriptado</p>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (adminUser === "rtc-admin" && adminPassword === "#Kalilinux22") {
                    setIsAdmin(true);
                    localStorage.setItem("rtc_is_admin", "true");
                    localStorage.setItem("rtc_admin_session", "rtc_sec_token_v1_#Kalilinux22_active");
                    setActiveTab("admin");
                    setShowAdminLoginModal(false);
                    setAdminUser("");
                    setAdminPassword("");
                    setAdminError("");
                  } else {
                    setAdminError("Credenciales inválidas. Reintente.");
                  }
                }} 
                className="w-full mt-5 flex flex-col gap-3.5"
              >
                {adminError && (
                  <div className="p-2.5 bg-red-950/60 border border-red-500/30 rounded-xl text-[10px] text-red-400 font-sans text-center">
                    {adminError}
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-mono uppercase text-slate-400 font-bold">Usuario Admin</label>
                  <input
                    type="text"
                    required
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    placeholder="Usuario RTC"
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 shadow-inner focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-mono uppercase text-slate-400 font-bold">Contraseña Secreta</label>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Contraseña"
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 shadow-inner focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdminLoginModal(false)}
                    className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold uppercase py-3 rounded-xl border border-slate-700/50 shadow-sm transition-all text-center cursor-pointer"
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold uppercase py-3 rounded-xl shadow-md transition-all text-center cursor-pointer"
                  >
                    Desbloquear
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Cybersecurity Sentinel - Floating Interactive Toast Alert */}
      {securityToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-[90%] bg-slate-900/95 border-2 border-orange-500 text-white rounded-2xl p-4 shadow-[0_0_25px_rgba(249,115,22,0.3)] backdrop-blur-md flex items-start gap-3 animate-bounce">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h5 className="text-[10px] font-mono font-extrabold text-orange-400 uppercase tracking-wider">Escudo de Ciberseguridad RTC</h5>
            <p className="text-[10.5px] text-slate-200 font-sans mt-1 leading-snug font-medium">
              {securityToastMessage}
            </p>
          </div>
        </div>
      )}

      {/* PWA Floating Installation Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-24 right-6 z-[9990] max-w-sm w-[90%] bg-slate-900/95 border border-orange-500/30 text-white rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-md flex flex-col gap-3 animate-fade-in">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 border border-orange-500/30 flex items-center justify-center shrink-0 shadow-inner">
                <Smartphone className="w-5 h-5 text-orange-500 animate-pulse" />
              </div>
              <div>
                <h5 className="text-[10px] font-mono font-extrabold text-orange-400 uppercase tracking-wider">Aplicación Móvil / Escritorio</h5>
                <h4 className="text-xs font-sans font-extrabold text-slate-100 uppercase tracking-tight">Llevar RTC en tu Dispositivo</h4>
              </div>
            </div>
            <button 
              type="button"
              onClick={handleDismissInstallBanner}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-full hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-slate-300 font-sans leading-normal">
            Instala la plataforma en tu teléfono o PC con un solo toque. Accede al instante sin usar almacenamiento adicional y con un rendimiento optimizado.
          </p>
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={handleDismissInstallBanner}
              className="flex-1 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 text-[9px] font-mono uppercase font-bold rounded-xl transition-all cursor-pointer text-center"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 text-white text-[9px] font-mono uppercase font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer text-center"
            >
              <Download className="w-3.5 h-3.5" />
              Instalar App 🚀
            </button>
          </div>
        </div>
      )}

      {/* iOS PWA Installation Tutorial Modal */}
      {showIosTutorial && (
        <div 
          onClick={() => setShowIosTutorial(false)}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-orange-500/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative text-slate-100 cursor-default"
          >
            <button
              type="button"
              onClick={() => setShowIosTutorial(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 hover:bg-slate-800 p-1.5 rounded-full transition-all flex items-center justify-center"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-orange-950 border border-orange-500/30 flex items-center justify-center text-orange-400 mb-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
                <Smartphone className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-sm font-sans font-extrabold text-white uppercase tracking-wider">Instalar en Apple iOS (Safari)</h3>
              <p className="text-[9px] text-orange-400 font-mono mt-0.5 uppercase tracking-widest">Procedimiento para iPhone / iPad</p>
              
              <div className="w-full mt-6 space-y-4 text-left font-sans text-xs">
                <div className="flex gap-3 items-start">
                  <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-slate-300 text-[10px] shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="text-slate-300 leading-normal text-[11px]">
                    Presiona el botón de <span className="font-extrabold text-orange-400 inline-flex items-center gap-1 bg-orange-500/10 px-1 py-0.5 rounded"><Share className="w-3.5 h-3.5 inline" /> Compartir</span> en la barra de navegación de Safari.
                  </p>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-slate-300 text-[10px] shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="text-slate-300 leading-normal text-[11px]">
                    Desliza hacia abajo en el menú de opciones y selecciona <span className="font-extrabold text-white bg-slate-800 px-1.5 py-0.5 rounded">"Añadir a la pantalla de inicio"</span>.
                  </p>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-slate-300 text-[10px] shrink-0 mt-0.5">
                    3
                  </div>
                  <p className="text-slate-300 leading-normal text-[11px]">
                    Confirma el nombre y presiona <span className="font-extrabold text-orange-400">"Añadir"</span> en la esquina superior derecha. ¡Y listo!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIosTutorial(false)}
                className="w-full mt-6 bg-orange-600 hover:bg-orange-500 text-white font-mono text-xs font-bold uppercase py-3 rounded-xl shadow-md transition-all text-center cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
