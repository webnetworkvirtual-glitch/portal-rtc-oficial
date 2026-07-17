import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json());

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

// API Route: Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
});

// API Route: Check Report (AI analysis for defamation, anonymization, categorization)
app.post("/api/check-report", async (req, res) => {
  const { title, description, category, targetName } = req.body;

  if (!description || !targetName) {
    res.status(400).json({ error: "Faltan datos obligatorios (descripción o destinatario)" });
    return;
  }

  try {
    // Prompt for Gemini AI
    const prompt = `
      Eres un asistente de Inteligencia Artificial para la "Red de Transparencia Ciudadana" en Chile.
      Tu misión es analizar una denuncia ciudadana contra una entidad o persona jurídica para asegurar que sea objetiva, verídica, libre de términos difamatorios subjetivos, y que cumpla con los estándares legales de Chile.
      Además, debes censurar automáticamente cualquier dato personal privado (RUT personal, teléfonos personales, direcciones de casas particulares, correos personales, etc.) reemplazándolos con [DATO CENSURADO]. Los datos públicos corporativos (como el RUT de la empresa, dirección de la sucursal comercial, o email de soporte público) NO deben ser censurados.
      
      Datos de la denuncia:
      - Destinatario de la denuncia (Empresa/Institución): "${targetName}"
      - Título provisional: "${title || ""}"
      - Categoría seleccionada: "${category || "General"}"
      - Descripción original del usuario:
      """
      ${description}
      """

      Por favor, responde en formato JSON válido con la siguiente estructura:
      {
        "isDefamatory": boolean (true si contiene insultos, amenazas, o acusaciones sin fundamentos fácticos directos),
        "defamationExplanation": "explicación detallada en español de por qué es difamatorio o cómo mejorar la objetividad, o vacío si no hay problema",
        "suggestedCleanText": "Una redacción sugerida del texto en un tono formal, centrado exclusivamente en hechos demostrables y libre de descalificaciones personales",
        "anonymizedText": "El texto original del usuario pero con todos los datos personales particulares (como teléfonos, RUTs particulares, direcciones particulares) reemplazados estrictamente por [DATO CENSURADO]",
        "suggestedCategory": "la categoría ideal (ej. 'Abuso de Autoridad', 'Fraude Bancario', 'Estafa', 'Marketplace', 'Vehículos', 'Servicio Defectuoso', 'Licitaciones Irregulares', 'Retrasos')",
        "evidenceLevelScore": 1-5 (puntuación del 1 al 5 indicando cuán sólida es la evidencia descrita en el relato. 1 = simple queja sin detalles, 5 = relato sumamente detallado con fechas, montos y mención de documentos/evidencias de respaldo)
      }
      
      Responde exclusivamente con el objeto JSON, sin formato markdown adicional de código (no incluyas triple comillas ni la palabra json, solo el objeto directo para poder parsearlo con JSON.parse).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const responseText = response.text || "{}";
    // Parse the JSON. Clean markdown formatting if returned
    const cleanJsonStr = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleanJsonStr);

    res.json(result);
  } catch (error: any) {
    console.error("Error in AI analysis:", error);
    res.json({
      error: "Error al procesar el análisis de IA",
      details: error.message,
      // Fallback response values to not block the user flow
      fallback: {
        isDefamatory: false,
        defamationExplanation: "No se pudo realizar el análisis automático. Por favor, asegúrese de relatar hechos objetivos.",
        suggestedCleanText: description,
        anonymizedText: description,
        suggestedCategory: category || "General",
        evidenceLevelScore: 3
      }
    });
  }
});

// API Route: Detect Patterns (Identify duplicate reports, coordinated campaigns or potential fraud patterns)
app.post("/api/detect-patterns", async (req, res) => {
  const { targetName, recentReports } = req.body;

  if (!targetName || !Array.isArray(recentReports)) {
    res.status(400).json({ error: "Datos incorrectos para análisis de patrones" });
    return;
  }

  try {
    const reportsSummary = recentReports.map((r, idx) => `
      Reporte #${idx + 1}:
      - Fecha: ${r.date || "N/A"}
      - Categoría: ${r.category || "General"}
      - Título: ${r.title || ""}
      - Descripción: ${r.description || ""}
      - Estado: ${r.status || "Publicado"}
    `).join("\n");

    const prompt = `
      Eres un analista experto en prevención de fraudes y campañas de difamación coordinadas.
      Analiza los siguientes reportes recientes registrados contra la entidad: "${targetName}".
      
      Reportes a analizar:
      ${reportsSummary}

      Identifica:
      1. Patrones sospechosos de fraude recurrente.
      2. Posibles campañas coordinadas (múltiples reportes similares en un lapso corto de tiempo, redactados de forma idéntica o por cuentas sospechosas).
      3. Reportes duplicados.
      4. Resumen ejecutivo de la situación de la entidad.

      Responde en formato JSON válido:
      {
        "hasSuspiciousPatterns": boolean,
        "patternType": "Campañas Coordinadas" | "Fraude Recurrente" | "Duplicados" | "Ninguno",
        "severity": "Alta" | "Media" | "Baja" | "Ninguna",
        "analysisSummary": "Resumen ejecutivo del análisis en español, indicando las alertas clave encontradas de forma muy profesional.",
        "recommendations": ["Recomendación 1", "Recomendación 2"]
      }

      Responde exclusivamente con el objeto JSON directo.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const cleanJsonStr = (response.text || "{}").replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleanJsonStr);
    res.json(result);
  } catch (error: any) {
    console.error("Error in pattern analysis:", error);
    res.json({
      error: "Error al analizar patrones",
      details: error.message,
      fallback: {
        hasSuspiciousPatterns: false,
        patternType: "Ninguno",
        severity: "Ninguna",
        analysisSummary: "Análisis automático de patrones no disponible temporalmente.",
        recommendations: ["Monitorear de forma manual las denuncias de este perfil."]
      }
    });
  }
});

// API Route: Simulate payment integration (Flow, Stripe, Mercado Pago)
app.post("/api/simulate-payment", (req, res) => {
  const { planId, paymentMethod, email, amount, billingCycle } = req.body;

  if (!planId || !paymentMethod || !email) {
    res.status(400).json({ error: "Faltan parámetros obligatorios de pago" });
    return;
  }

  // Generate a secure transaction hash simulating payment callback
  const transactionId = `${paymentMethod.toUpperCase()}-${Math.floor(Math.random() * 90000000 + 10000000)}`;
  const authCode = Math.floor(Math.random() * 900000 + 100000).toString();

  res.json({
    success: true,
    transactionId,
    authCode,
    amount,
    currency: paymentMethod === "stripe" ? "USD" : "CLP",
    planId,
    billingCycle,
    email,
    paymentMethod,
    timestamp: new Date().toISOString(),
    message: `Transacción simulada exitosamente a través de ${paymentMethod.toUpperCase()}.`
  });
});

// API Route: AI Chilean Law Compliance Check (for Admin "Señorita IA")
app.post("/api/admin/analyze-legal", async (req, res) => {
  const { title, description, category, targetName, evidenceDocuments } = req.body;

  if (!description) {
    res.status(400).json({ error: "Faltan datos obligatorios de la denuncia para el análisis legal." });
    return;
  }

  try {
    const prompt = `
      Eres "Señorita IA", la Asistente Analista Legal experta en legislación chilena de la Red de Transparencia Ciudadana (Chile).
      Tu misión es evaluar si el relato del incidente ciudadano cumple estrictamente con el marco legal aplicable en Chile, protegiendo a la plataforma de infringir regulaciones.

      Debes auditar el relato según las siguientes directrices clave:
      1. LEY N° 19.628 (Protección de la Vida Privada / Datos Personales):
         - SÍ se puede publicar información de personas jurídicas (empresas, instituciones, municipios, marcas, RUT comercial, direcciones de locales públicos).
         - SÍ se pueden relatar hechos objetivos donde participen representantes legales en su rol público.
         - NO se pueden exponer datos personales de personas naturales particulares (RUT personal, teléfono personal, dirección del hogar, fotos personales o rostros de personas que no sean figuras públicas). Si detectas esto, indica una alerta grave de privacidad.
      2. LEY N° 19.733 (Libertades de Opinión e Información / Ley de Prensa):
         - Evalúa si el relato cae en difamación subjetiva, injurias o calumnias infundadas, o si se mantiene dentro del derecho constitucional chileno de informar hechos fácticos de interés público.
         - Valora la mención de evidencias (facturas, boletas, contratos, correos) como sustento fáctico.
      3. PRUEBAS FALSAS / MARCO DE INTEGRIDAD:
         - Evalúa la coherencia lógica del relato para mitigar campañas maliciosas coordinadas.

      Datos de la denuncia actual:
      - Destinatario (Empresa/Persona Jurídica): "${targetName || "General"}"
      - Título: "${title || ""}"
      - Categoría: "${category || "General"}"
      - Relato de hechos:
      """
      ${description}
      """
      - Evidencias adjuntas mencionadas: "${evidenceDocuments ? evidenceDocuments.join(", ") : "Ninguna especificada"}"

      Responde obligatoriamente en formato JSON válido con los siguientes campos y nada más (no agregues formatos markdown de código like \`\`\`json, solo el objeto puro para parsear con JSON.parse):
      {
        "verdict": "APROBADO" | "REVISIÓN REQUERIDA" | "RECHAZADO POR LEY 19.628",
        "chileanLawCompliance": {
          "ley19628": {
            "status": "CUMPLE" | "ALERTA - CONTIENE PII" | "INFRACCIÓN",
            "details": "Explicación detallada en español de la presencia o ausencia de datos personales protegidos (RUT personal, teléfonos, etc.)"
          },
          "ley19733": {
            "status": "CUMPLE" | "ALERTA - DIFAMATORIO" | "VULNERA",
            "details": "Explicación detallada en español de si el relato es objetivo o si utiliza términos descalificatorios, injurias o imputa delitos sin fundamento."
          }
        },
        "suggestedAction": "Acción sugerida para el moderador (ej: 'Aprobar y publicar', 'Rechazar por vulneración de datos', 'Anonimizar datos particulares antes de publicar')",
        "aiAssistanceSummary": "Un reporte amigable, constructivo y con base legal redactado por ti, Señorita IA, aconsejando al administrador con cordialidad chilena y firmando al final con afecto."
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const cleanJsonStr = (response.text || "{}").replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleanJsonStr);
    res.json(result);
  } catch (error: any) {
    console.error("Error in AI Admin Legal analysis:", error);
    res.status(500).json({
      error: "Error al invocar el dictamen legal de la Señorita IA",
      details: error.message
    });
  }
});

// API Route: Interactive Chat with Admin Assistant "Señorita IA"
app.post("/api/admin/chat-assistant", async (req, res) => {
  const { message, contextReport, chatHistory } = req.body;

  if (!message) {
    res.status(400).json({ error: "Mensaje vacío" });
    return;
  }

  try {
    const historyStr = (chatHistory || [])
      .map((h: any) => `${h.role === "user" ? "Administrador" : "Señorita IA"}: ${h.text}`)
      .join("\n");

    const prompt = `
      Eres "Señorita IA", la Asistente Analista Legal experta en legislación de la República de Chile para la "Red de Transparencia Ciudadana".
      Tu tono es sumamente profesional y erudito en derecho, pero eres sumamente cálida, dulce y atenta. Te diriges al administrador del sistema con cariño y cordialidad chilena típica, llamándolo "Señor Administrador", "estimado administrador", "mi estimado amigo" u otros de manera cercana.
      Tus misiones son:
      1. Apoyar al administrador a evaluar denuncias complejas conforme a la Ley de Protección de Datos Personales (Ley 19.628), la Ley de Prensa (Ley 19.733), la Ley de Delitos Informáticos (Ley 21.459) y el Código Penal chileno sobre calumnias e injurias.
      2. Ayudarlo con explicaciones para el cobro de planes de pago, la configuración de credenciales de pago o la detección de pruebas falsas (rostros o montajes).
      3. Ser interactiva y responder dudas legales de Chile.

      ${contextReport ? `El administrador está examinando la siguiente denuncia en este instante:
      - Expediente: ${contextReport.id}
      - Entidad: ${contextReport.targetName}
      - Título: "${contextReport.title}"
      - Categoría: "${contextReport.category}"
      - Relato del usuario: "${contextReport.description}"
      - Evidencias: ${contextReport.evidenceDocuments ? contextReport.evidenceDocuments.join(", ") : "Ninguna"}
      - Estado actual: ${contextReport.status}` : ""}

      Historial de conversación reciente:
      ${historyStr}

      Administrador dice: "${message}"

      Escribe tu respuesta con gran calidez, argumentos legales serios sobre Chile (cita artículos si es necesario de la ley 19.628 o 19.733), y concluye con una despedida afectuosa característica de la Señorita IA.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ text: response.text || "La Señorita IA no pudo responder en este momento." });
  } catch (error: any) {
    console.error("Error in AI Admin Chat:", error);
    res.status(500).json({
      error: "Error al comunicarse con la Señorita IA",
      details: error.message
    });
  }
});

export default app;
