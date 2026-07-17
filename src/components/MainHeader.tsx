import React from "react";
import { ShieldCheck, Search, FileText, Send, BarChart2, Award, Settings, UserCheck } from "lucide-react";

interface MainHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: { email: string; isPremium: boolean; plan: string } | null;
  onLogout: () => void;
  onLoginClick: () => void;
  isAdmin: boolean;
  onBackdoorTriggered: () => void;
}

export const MainHeader: React.FC<MainHeaderProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  onLoginClick,
  isAdmin,
  onBackdoorTriggered
}) => {
  const clickTimes = React.useRef<number[]>([]);

  const handleLogoClick = () => {
    const now = Date.now();
    const updatedClicks = [...clickTimes.current.filter((t) => now - t < 7000), now];
    clickTimes.current = updatedClicks;
    if (updatedClicks.length >= 5) {
      onBackdoorTriggered();
      clickTimes.current = [];
    }
  };

  const navItems = [
    { id: "search", label: "Inicio / Buscar", icon: Search, ledColor: "bg-orange-500 shadow-[0_0_8px_#f97316]" },
    { id: "report", label: "Reportar Incidente", icon: Send, ledColor: "bg-orange-500 shadow-[0_0_8px_#f97316]" },
    { id: "reply", label: "Derecho a Respuesta", icon: ShieldCheck, ledColor: "bg-sky-500 shadow-[0_0_8px_#0284c7]" },
    { id: "stats", label: "Estadísticas y Mapas", icon: BarChart2, ledColor: "bg-emerald-500 shadow-[0_0_8px_#059669]" },
    { id: "premium", label: "Suscripciones Premium", icon: Award, ledColor: "bg-amber-500 shadow-[0_0_8px_#d97706]" },
    ...(isAdmin ? [{ id: "admin", label: "Moderación / IA", icon: Settings, ledColor: "bg-purple-500 shadow-[0_0_8px_#7c3aed]" }] : [])
  ];

  return (
    <header className="w-full bg-slate-100 rounded-3xl p-6 border border-slate-200/90 shadow-[8px_8px_16px_#c5c9d1,-8px_-8px_16px_#ffffff] mb-8 relative">
      {/* Absolute background accent lines resembling a technical schematic */}
      <div className="absolute top-0 left-12 right-12 h-[2px] bg-gradient-to-r from-transparent via-orange-500/20 to-transparent"></div>
      <div className="absolute bottom-4 left-6 right-6 h-[1px] bg-slate-200"></div>

      {/* Decorative metal rivets */}
      <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-slate-300 border border-slate-400/40 shadow-inner"></div>
      <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-slate-300 border border-slate-400/40 shadow-inner"></div>

      {/* Title & Brand Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          {/* Custom skeuomorphic heavy-duty badge for logo */}
          <div 
            onClick={handleLogoClick}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 flex items-center justify-center shadow-[4px_4px_8px_#cfd2d9,-4px_-4px_8px_#ffffff] relative cursor-pointer active:scale-95 transition-all duration-150"
            title="RTC Chile Logo"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-orange-500/40 shadow-[inset_0_2px_5px_rgba(0,0,0,0.8)]">
              <ShieldCheck className="w-6 h-6 text-orange-500" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-sans tracking-tight font-extrabold text-slate-800 uppercase">
                Red de Transparencia <span className="text-orange-600">Ciudadana</span>
              </h1>
              <span className="text-[10px] bg-orange-500/10 text-orange-700 border border-orange-200/60 font-mono py-0.5 px-2 rounded-full font-bold">
                Chile
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono uppercase mt-0.5 tracking-wider">
              Sistema Descentralizado de Antecedentes Públicos & Derecho a Respuesta
            </p>
          </div>
        </div>

        {/* User Account State Panel */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3 bg-slate-200/60 border border-slate-300/60 rounded-2xl py-1.5 px-3.5 shadow-inner">
              <div className="flex flex-col items-end">
                <span className="text-[11px] font-mono text-slate-600 font-medium">{currentUser.email}</span>
                <span className="text-[9px] font-mono uppercase font-bold text-orange-600 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Plan: {currentUser.plan.toUpperCase()}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="text-[10px] font-mono tracking-wider font-bold uppercase text-slate-500 hover:text-rose-500 transition-colors py-1 px-2.5 rounded-lg border border-slate-300 bg-slate-100 shadow-[2px_2px_4px_#cbd5e1,-2px_-2px_4px_#ffffff] active:shadow-inner cursor-pointer"
              >
                Salir
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="hidden lg:flex flex-col items-end text-right">
                <span className="text-[10px] text-slate-700 font-sans font-extrabold uppercase">¿Por qué registrarse?</span>
                <span className="text-[8.5px] text-slate-500 font-mono tracking-tight leading-none">SEGUIMIENTO • ALERTAS • SUSCRIPCIÓN DE PAGO</span>
              </div>
              <button
                onClick={onLoginClick}
                className="flex items-center gap-2 text-xs font-mono tracking-wider font-bold uppercase py-2.5 px-4 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 shadow-[4px_4px_8px_#cbd5e1,-4px_-4px_8px_#ffffff] hover:text-orange-600 hover:border-orange-300/60 active:shadow-inner transition-all duration-150 cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-orange-500 animate-pulse" />
                Acceso / Crear Cuenta
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tactical Physical Push-Button Nav Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pb-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all duration-250 relative ${
                isActive
                  ? "bg-slate-200 border-slate-400/60 text-slate-800 shadow-[inset_4px_4px_8px_#b8bcc4,inset_-4px_-4px_8px_#ffffff]"
                  : "bg-slate-100 border-slate-200/90 text-slate-600 shadow-[4px_4px_8px_#cfd2d9,-4px_-4px_8px_#ffffff] hover:shadow-[2px_2px_4px_#cfd2d9,-2px_-2px_4px_#ffffff] hover:text-slate-800"
              }`}
            >
              {/* Physical LED Light Indicator */}
              <div className="absolute top-2 right-3 flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    isActive ? item.ledColor : "bg-slate-300 shadow-none"
                  }`}
                ></div>
              </div>

              <Icon className={`w-5 h-5 mb-1.5 ${isActive ? "text-orange-600 scale-105" : "text-slate-500"}`} />
              <span className="text-xs font-sans font-semibold tracking-tight leading-tight text-center">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
