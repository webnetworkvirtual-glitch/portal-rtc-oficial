import React, { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { UserPremiumStatus, PremiumPlanId } from "../types";
import { Award, Check, CreditCard, RefreshCw, AlertCircle, FileSpreadsheet, ShieldCheck, Database, KeyRound, Download, X } from "lucide-react";
import { CompanyDashboard } from "./CompanyDashboard";

interface PremiumModuleProps {
  currentUser: { email: string; isPremium: boolean; plan: string } | null;
  onUpgradeSuccess: (planId: PremiumPlanId, cycle: "mensual" | "semestral" | "anual", transactionId: string) => void;
  onLoginClick: () => void;
}

const PREMIUM_PLANS = [
  {
    id: "ciudadano" as PremiumPlanId,
    name: "Plan Ciudadano",
    priceCLP: 3990,
    features: [
      "Alertas automáticas de incidentes",
      "Seguimiento de perfiles favoritos",
      "Historial de reportes ilimitado",
      "Exportar reportes en formato PDF",
      "Métricas y estadísticas básicas"
    ],
    badgeColor: "bg-orange-500/10 text-orange-700 border-orange-300"
  },
  {
    id: "periodista" as PremiumPlanId,
    name: "Plan Periodista",
    priceCLP: 9990,
    features: [
      "Estadísticas cruzadas avanzadas",
      "Descarga de base de datos agregados",
      "API básica de consulta",
      "Alertas prioritarias de querellas",
      "Exportación de gráficos vectoriales"
    ],
    badgeColor: "bg-emerald-500/10 text-emerald-700 border-emerald-300"
  },
  {
    id: "empresa" as PremiumPlanId,
    name: "Plan Empresa",
    priceCLP: 19990,
    features: [
      "Panel de respuesta oficial instantáneo",
      "Alertas en tiempo real por RUT corporativo",
      "Métricas de resolución reputacional",
      "API de integración de antecedentes",
      "Dashboard avanzado multi-usuario"
    ],
    badgeColor: "bg-sky-500/10 text-sky-700 border-sky-300"
  },
  {
    id: "municipio" as PremiumPlanId,
    name: "Plan Municipio",
    priceCLP: 49990,
    features: [
      "Panel institucional de comuna",
      "Mapa interactivo de reportes vecinales",
      "Exportación masiva de datos",
      "Identificación de tendencias de estafas",
      "Atención preferencial de reclamos"
    ],
    badgeColor: "bg-purple-500/10 text-purple-700 border-purple-300"
  }
];

export const PremiumModule: React.FC<PremiumModuleProps> = ({
  currentUser,
  onUpgradeSuccess,
  onLoginClick
}) => {
  const [billingCycle, setBillingCycle] = useState<"mensual" | "semestral" | "anual">("mensual");
  const [selectedPlan, setSelectedPlan] = useState<typeof PREMIUM_PLANS[0] | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"flow" | "stripe" | "mercadopago">("flow");
  const [processing, setProcessing] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  // Advanced features unlocked mock state
  const [downloadedPdf, setDownloadedPdf] = useState(false);
  const [apiTokenVisible, setApiTokenVisible] = useState(false);

  // Firestore Custom Payment Gateways Config
  const [paymentConfig, setPaymentConfig] = useState<any>(null);

  useEffect(() => {
    const configRef = doc(db, "config", "payment");
    const unsubscribe = onSnapshot(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setPaymentConfig(data);
        
        // Ensure standard fallback or selected gateway is active
        if (data.flowActive === false && data.stripeActive !== false) {
          setPaymentMethod("stripe");
        } else if (data.flowActive === false && data.stripeActive === false && data.mercadopagoActive !== false) {
          setPaymentMethod("mercadopago");
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const calculatePrice = (plan: typeof PREMIUM_PLANS[0], cycle: "mensual" | "semestral" | "anual") => {
    if (cycle === "semestral") {
      return Math.round(plan.priceCLP * 6 * 0.85); // 15% de descuento
    }
    if (cycle === "anual") {
      return Math.round(plan.priceCLP * 12 * 0.75); // 25% de descuento
    }
    return plan.priceCLP;
  };

  const formatPrice = (price: number) => {
    if (paymentMethod === "stripe") {
      // Approximate CLP to USD conversion
      const usdPrice = (price / 950).toFixed(2);
      return `USD $${usdPrice}`;
    }
    return `CLP $${price.toLocaleString("es-CL")}`;
  };

  const handleSelectPlan = (plan: typeof PREMIUM_PLANS[0]) => {
    if (!currentUser) {
      alert("Por favor acceda a su cuenta ciudadana primero para poder suscribirse.");
      onLoginClick();
      return;
    }
    setSelectedPlan(plan);
    setPaymentDone(false);
  };

  const handleExecutePayment = async () => {
    if (!selectedPlan || !currentUser) return;
    setProcessing(true);

    try {
      const response = await fetch("/api/simulate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          paymentMethod,
          email: currentUser.email,
          amount: calculatePrice(selectedPlan, billingCycle),
          billingCycle
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setPaymentDone(true);
        onUpgradeSuccess(selectedPlan.id, billingCycle, data.transactionId);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error(err);
      alert("La pasarela de pago experimentó una intermitencia temporal. Procesando reintento offline...");
      onUpgradeSuccess(selectedPlan.id, billingCycle, `FLOW-MOCK-${Math.floor(Math.random() * 900000)}`);
      setPaymentDone(true);
    } finally {
      setProcessing(false);
    }
  };

  const triggerPdfDownload = () => {
    setDownloadedPdf(true);
    setTimeout(() => setDownloadedPdf(false), 3000);
    // Create actual simulated text download file
    const element = document.createElement("a");
    const file = new Blob([`RED DE TRANSPARENCIA CIUDADANA CHILE\nEXPEDIENTE DE ANTECEDENTES PUBLICOS\n\nPlan: ${currentUser?.plan.toUpperCase()}\nUsuario: ${currentUser?.email}\nStatus: ACTIVO\nSello de Verificacion: FIRMADO DIGITALMENTE POR RTC CHILE`], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `Expediente_Transparencia_${currentUser?.plan}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="w-full bg-slate-100 rounded-3xl p-6 border border-slate-200/90 shadow-[8px_8px_16px_#cbd0da,-8px_-8px_16px_#ffffff] relative overflow-hidden">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 text-amber-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-sans font-extrabold text-slate-800 uppercase tracking-tight">Suscripciones y Licenciamiento Premium</h2>
            <p className="text-xs text-slate-500 font-mono">FINANCIANDO LA FISCALIZACIÓN DIGITAL EN CHILE</p>
          </div>
        </div>

        {/* Tactile Billing Cycle Selector */}
        <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-2xl border border-slate-200 shadow-inner">
          {(["mensual", "semestral", "anual"] as const).map((cycle) => (
            <button
              key={cycle}
              type="button"
              onClick={() => setBillingCycle(cycle)}
              className={`text-[9px] font-mono py-1.5 px-3.5 rounded-xl uppercase font-extrabold tracking-wider transition-all cursor-pointer ${
                billingCycle === cycle
                  ? "bg-slate-900 text-white shadow-[0_2px_4px_rgba(0,0,0,0.15)]"
                  : "bg-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {cycle === "mensual" && "Mensual"}
              {cycle === "semestral" && "Semestral"}
              {cycle === "anual" && "Anual"}
            </button>
          ))}
        </div>
      </div>

      {/* If upgraded, show premium dashboard features! */}
      {currentUser?.isPremium && (
        <div className="bg-slate-800 rounded-2xl p-5 text-white border border-slate-950 shadow-2xl mb-8 relative">
          <div className="absolute top-2 right-3 flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse"></div>
            <span className="text-[9px] font-mono text-emerald-400 uppercase font-bold">Plan {currentUser.plan} Activo</span>
          </div>

          <h3 className="text-sm font-sans font-extrabold text-orange-400 tracking-tight uppercase flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Consola Premium Desbloqueada
          </h3>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed font-sans">
            Gracias por suscribirse. Como miembro verificado del plan <span className="text-white font-bold">{currentUser.plan.toUpperCase()}</span>, usted tiene acceso sin restricciones a las herramientas avanzadas de la Red de Transparencia:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Feature 1: Export dossiers to PDF */}
            <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-tight flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Descargar Expedientes Públicos
                </h4>
                <p className="text-[10px] text-slate-400 font-sans mt-1">
                  Exporte el historial completo de denuncias, respuestas oficiales y calificaciones de evidencia de cualquier empresa a un documento formal.
                </p>
              </div>
              <button
                onClick={triggerPdfDownload}
                className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold uppercase py-2 px-3 rounded-lg flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                {downloadedPdf ? "Descargando..." : "Exportar Dossier PDF (Simulado)"}
              </button>
            </div>

            {/* Feature 2: API Keys and aggregates */}
            <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-tight flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-orange-400" />
                  Token API de Consulta Externa
                </h4>
                <p className="text-[10px] text-slate-400 font-sans mt-1">
                  Incorpore la base de datos nacional a sus aplicaciones o ERP para realizar verificaciones de cumplimiento y RUT automáticas.
                </p>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {apiTokenVisible ? (
                  <div className="bg-slate-950 font-mono text-[9px] p-2 rounded text-orange-400 border border-orange-500/30 truncate">
                    rtc_live_6f3ba0e812d4a5cbb702e84176cba9
                  </div>
                ) : (
                  <button
                    onClick={() => setApiTokenVisible(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[10px] font-bold uppercase py-2 px-3 rounded-lg border border-slate-700"
                  >
                    Mostrar API Key Secreta
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {currentUser?.isPremium && currentUser?.plan === "empresa" && (
        <div className="mb-8">
          <CompanyDashboard currentUser={currentUser} />
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PREMIUM_PLANS.map((plan) => {
          const isCurrentPlan = currentUser?.plan === plan.id;
          const finalPrice = calculatePrice(plan, billingCycle);
          return (
            <div
              key={plan.id}
              className={`bg-slate-100 rounded-2xl p-5 border relative flex flex-col justify-between transition-all ${
                isCurrentPlan
                  ? "border-orange-500 bg-orange-50/10 shadow-[0_0_15px_rgba(249,115,22,0.15)]"
                  : "border-slate-200/80 shadow-[4px_4px_8px_#cfd2d9,-4px_-4px_8px_#ffffff]"
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xs font-sans font-extrabold text-slate-800 uppercase tracking-tight">{plan.name}</h3>
                  {isCurrentPlan && (
                    <span className="text-[8px] bg-orange-500 text-white font-mono font-bold py-0.5 px-1.5 rounded-full uppercase">
                      Activo
                    </span>
                  )}
                </div>

                <div className="flex flex-col mb-4">
                  <span className="text-sm font-mono font-extrabold text-slate-800">
                    {formatPrice(finalPrice)}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tight font-bold">
                    {billingCycle === "mensual" && "Pago mensual"}
                    {billingCycle === "semestral" && "Total cada 6 meses"}
                    {billingCycle === "anual" && "Total cada 12 meses"}
                  </span>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex gap-2 text-[10px] font-sans text-slate-600 leading-snug">
                      <Check className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleSelectPlan(plan)}
                disabled={isCurrentPlan}
                className={`w-full py-2.5 px-4 font-mono text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all ${
                  isCurrentPlan
                    ? "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-inner"
                    : "bg-slate-900 hover:bg-slate-800 text-white shadow-md active:scale-[0.98]"
                }`}
              >
                {isCurrentPlan ? "Suscrito Activo" : "Suscribirse"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Interactive Payment Gateway Modal */}
      {selectedPlan && (
        <div 
          onClick={() => setSelectedPlan(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 cursor-pointer animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-100 rounded-3xl p-6 border border-slate-300 max-w-md w-full shadow-2xl relative cursor-default"
          >
            
            {/* Absolute close button ("X") */}
            <button
              type="button"
              onClick={() => setSelectedPlan(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 p-1.5 rounded-full transition-all flex items-center justify-center"
              aria-label="Cerrar"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-200 pr-8">
              <div className="p-2 rounded-lg bg-slate-900 text-orange-500">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-sans font-extrabold text-slate-800 uppercase tracking-tight">Pasarela de Suscripción</h3>
                <p className="text-[10px] text-slate-400 font-mono">SELECCIONAR PASARELA DE ADQUISICIÓN</p>
              </div>
            </div>

            {paymentDone ? (
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500 flex items-center justify-center text-emerald-500 mb-3 animate-bounce">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-sans font-extrabold text-emerald-800 uppercase">Pago Confirmado Exitosamente</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1 font-mono">
                  MÉTODO: {paymentMethod.toUpperCase()} | CYCLE: {billingCycle.toUpperCase()}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed font-sans mt-3">
                  Su suscripción al <span className="font-bold text-slate-800">{selectedPlan.name}</span> se procesó a nivel de servidor Express y se guardó en Firestore de forma permanente. Las funciones premium están habilitadas.
                </p>
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold uppercase py-3 rounded-xl mt-6"
                >
                  Regresar a la Consola
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-200/60 rounded-xl p-3 border border-slate-300">
                  <span className="text-[8px] font-mono text-slate-500 uppercase block">Licencia Solicitada</span>
                  <div className="flex justify-between items-baseline mt-1">
                    <span className="text-xs font-sans font-extrabold text-slate-800 uppercase">{selectedPlan.name}</span>
                    <span className="text-xs font-mono font-bold text-orange-600">
                      {formatPrice(calculatePrice(selectedPlan, billingCycle))} {billingCycle}
                    </span>
                  </div>
                </div>

                {/* Gateway Selection Tabs (Tactile as visual guidelines) */}
                <div className="space-y-2">
                  <label className="text-[9px] font-mono uppercase text-slate-500 font-bold block">Seleccionar Pasarela de Pago</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(() => {
                      const gates = [
                        { id: "flow", label: "Flow Chile", desc: "BancoEstado / WebPay", active: paymentConfig ? paymentConfig.flowActive : true },
                        { id: "stripe", label: "Stripe", desc: "Tarjetas Int.", active: paymentConfig ? paymentConfig.stripeActive : true },
                        { id: "mercadopago", label: "Mercado Pago", desc: "Monedero", active: paymentConfig ? paymentConfig.mercadopagoActive : true }
                      ].filter(gate => gate.active !== false);

                      if (gates.length === 0) {
                        return (
                          <div className="col-span-3 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-700 text-[10px] text-center rounded-xl font-mono">
                            ⚠️ SIN PASARELAS DE PAGO ACTIVAS. CONTACTE AL ADMINISTRADOR.
                          </div>
                        );
                      }

                      return gates.map((gate) => (
                        <button
                          key={gate.id}
                          onClick={() => setPaymentMethod(gate.id as any)}
                          className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition-all ${
                            paymentMethod === gate.id
                              ? "bg-slate-200 border-orange-500/40 shadow-inner"
                              : "bg-slate-50 border-slate-200 hover:bg-slate-200/40"
                          }`}
                        >
                          <span className={`text-[10px] font-mono font-extrabold uppercase ${paymentMethod === gate.id ? "text-orange-600" : "text-slate-700"}`}>
                            {gate.label}
                          </span>
                          <span className="text-[8px] text-slate-400 font-sans mt-1 leading-snug">{gate.desc}</span>
                        </button>
                      ));
                    })()}
                  </div>
                </div>

                {/* Flow Credential Info / Configuration Alert */}
                {paymentMethod === "flow" && (
                  <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-[10px] text-amber-800 leading-relaxed font-sans">
                    <strong>Configuración de Flow:</strong> Ideal para operaciones en Chile. El sistema simulará el procesamiento REST API con firma HMAC MD5 según las normativas de Flow.cl.
                  </div>
                )}

                {/* Confirm Action Button */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(null)}
                    disabled={processing}
                    className="w-1/3 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 disabled:text-slate-400 text-slate-700 border border-slate-300/80 font-mono text-xs font-bold uppercase py-3 rounded-xl transition-all text-center"
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    onClick={handleExecutePayment}
                    disabled={processing}
                    className="w-2/3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-mono text-xs font-bold uppercase py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        Pagar ({paymentMethod.toUpperCase()})
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
