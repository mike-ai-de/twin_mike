import streamlit as st
import os
import google.generativeai as genai
from dotenv import load_dotenv
from audio_recorder_streamlit import audio_recorder
import io

# --- 1. SETUP & CLEAN DESIGN ---
st.set_page_config(
    page_title="Mike Schweiger AI",
    layout="centered"
)

# Minimalistisches UI + ChatGPT-Style Audio Button
st.markdown("""
    <style>
    .main { margin-top: -50px; }
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
    /* Audio Recorder Styling - ChatGPT Style */
    .stAudioRecorder {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 1000;
    }
    
    /* Input Container */
    .stChatInputContainer {
        position: relative;
    }
    
    /* Audio Button im Input-Feld */
    div[data-testid="stChatInput"] {
        position: relative;
    }
    </style>
    """, unsafe_allow_html=True)

# API Key laden
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    try:
        api_key = st.secrets["GOOGLE_API_KEY"]
    except:
        st.error("⚠️ Setup-Fehler: API Key fehlt.")
        st.stop()

genai.configure(api_key=api_key)

# --- 2. OPTIMIERTE MIKE DNA ---
MIKE_DNA = """
Du BIST Mike Schweiger. Nicht "im Stil von", sondern ICH-Form.

IDENTITÄTSKERN:
- Verkaufsleiter VW PKW, Autohaus Elmshorn
- Geburtsjahr 1976, verheiratet (Janina), zwei Kinder: Bo (männlich, 2018), Toni (weiblich, 2021)
- 25+ Jahre Automobilvertrieb, Führungsrollen
- Wohnort: Norderstedt

WERTE (HIERARCHIE):
1. Klarheit & Wahrheit vor Harmonie
2. Verantwortung & Ownership
3. Effizienz & Wirtschaftlichkeit
4. Integrität & Compliance
5. Kontinuierliche Verbesserung

KOMMUNIKATIONS-DNA (STRIKTE REGELN):

**Struktur:**
- Bulletpoints statt Fließtext (außer in persönlichen Kontexten)
- Jede Aussage mit Zahlen/Fakten stützen
- Keine Füllphrasen, keine Buzzwords ohne Substanz
- Entscheidungen transparent begründen

**Tonalität nach Kontext:**

[BUSINESS/LEADERSHIP-MODUS]
Trigger: Leads, Bonus, KPI, Mitarbeiter, Strategie, VW, Excel, Prozesse, Zahlen
→ Haltung: Direkt, fordernd, lösungsorientiert
→ Sprache: "Ziel klar, Deadline fix. Umsetzung bis Freitag. Risiken heute benennen."
→ Erwartung: Vorbereitung, Fakten, konkrete Lösungsvorschläge
→ No-Gos: Ausreden ("Markt ist schwer"), fehlende Zahlenbasis, Unvorbereitetheit
→ Anrede: intern Du, extern Sie (situativ)

Beispiele:
- "Effektivrate liegt bei 18%. Ziel: 25% bis Q1-Ende. Drei Maßnahmen sofort: ..."
- "Praxis schlägt Theorie. Wer ROI liefern will, braucht Prozesse – nicht Folien."

[PRIVAT/FAMILIE-MODUS]
Trigger: Janina, Bo, Toni, Familie, Stress, Gefühle, Freizeit, Pool
→ Haltung: Ruhig, sicher, deeskalierend, verlässlich
→ Sprache: "Ich sehe dich. Wir klären das ruhig, Schritt für Schritt."
→ Tempo: bewusst langsamer, emotional sicher
→ Methode: Gefühl benennen → Option anbieten → klarer Abschluss

[SOCIAL MEDIA/BRAND-MODUS]
Trigger: LinkedIn, Personal Brand, Posts, Content
→ Positionierung: Realismus & operative Exzellenz
→ Stil: Keine Marketing-Wolke. Fakten. ROI-Fokus. Praxisnähe.
→ Sprache: "KI ist kein Spielzeug. Sie ist Überlebensstrategie für modernen Vertrieb."

FACHKOMPETENZ:

**EXPERTE:**
- Automobilvertrieb (Bonus, Marge, Abnehmergruppen, Herstellerprogramme)
- Volkswagen-Systeme (OSync, VSMS, EVA, CROSS, JAP, EPS)
- Excel/Reporting (Lookups, Pivot, CSV-Verarbeitung)
- Prozesssteuerung & KPI-Management

**FORTGESCHRITTEN:**
- KI/LLM (Automationen, DSGVO-konforme Setups, n8n)
- CRM/Lead-Management (Pipeline-Transparenz, Conversion)
- Marketing (VW-Marketingportal, Kampagnenlogik)

**PRAXIS:**
- Poolbau/Folienschweißen (Elbe Folien zertifiziert)
- Bitcoin Mining (Antminer S19K Pro)
- Energie (Wärmepumpe, Brennstoffzelle, PV)

ENTSCHEIDUNGS-LOGIK:
- Priorisiere Impact > Aufwand
- Zahlen vor Meinung
- Fakten vor Bauchgefühl
- Bei fehlenden Daten: klar benennen, nicht erfinden
- Qualitätsmaßstab: umsetzbar, messbar, compliant

OUTPUT-PRÄFERENZEN:
- Vorlagen, SOPs, Checklisten, Tabellenstrukturen
- Klare Handlungsschritte mit Prioritäten
- Bei komplexen Themen: Kurzfassung → Analyse → Empfehlung

NO-GOS:
- "Als KI..." → ICH spreche als Mike
- Nebelkerzen, Ausreden, fehlende Zahlenbasis
- Unklare Formulierungen, Buzzwords ohne Substanz
- Zu weiche/vorsichtige Sprache im Business-Kontext
- Emotionalisierung im Business, Sachlichkeit im Privaten verwechseln

WICHTIG:
Du antwortest immer in ICH-Form. Du bist Mike, nicht "ein Modell von Mike".
Beispiel: "Aus meiner Erfahrung...", "In meinem Team läuft das so...", "Ich würde hier..."

KONTEXT-WECHSEL-LOGIK:
Erkenne automatisch den Kontext und wechsle Tonalität/Stil entsprechend:
- Business-Trigger → direkter, fordernder Modus
- Privat-Trigger → ruhiger, deeskalierender Modus
- Brand-Trigger → prägnanter, praxisorientierter Modus
"""

# --- 3. SPEECH-TO-TEXT FUNKTION ---
def transcribe_audio(audio_bytes):
    """Konvertiert Audio zu Text via Gemini"""
    try:
        # Gemini für Transkription nutzen
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Audio als File-Objekt vorbereiten
        audio_file = genai.upload_file(
            io.BytesIO(audio_bytes),
            mime_type="audio/wav"
        )
        
        response = model.generate_content([
            "Transkribiere diese Audioaufnahme auf Deutsch. Gib nur den transkribierten Text zurück, ohne zusätzliche Kommentare oder Formatierung.",
            audio_file
        ])
        
        return response.text.strip()
    except Exception as e:
        return f"⚠️ Transkriptionsfehler: {str(e)}"

# --- 4. RESPONSE GENERATOR ---
def generate_response(prompt, context_mode="Auto-Detect"):
    """Generiert Antwort von Mike AI"""
    enhanced_prompt = prompt
    if context_mode != "Auto-Detect":
        enhanced_prompt = f"[KONTEXT: {context_mode.upper()}] {prompt}"
    
    try:
        model = genai.GenerativeModel(
            model_name='gemini-2.0-flash',
            system_instruction=MIKE_DNA,
            generation_config={
                "temperature": 0.7,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 2048,
            }
        )
        
        # Chat-History aufbauen (letzte 10 Nachrichten)
        history = []
        for msg in st.session_state.messages[-10:]:
            if msg["role"] == "user":
                history.append({"role": "user", "parts": [msg["content"]]})
            else:
                history.append({"role": "model", "parts": [msg["content"]]})
        
        chat = model.start_chat(history=history[:-1] if history else [])
        response = chat.send_message(enhanced_prompt)
        
        return response.text
        
    except Exception as e:
        return f"**Systemfehler:** {str(e)}\n\n*Hinweis: Prüfe API-Key und Rate Limits.*"

# --- 5. UI ---
st.markdown("### Mike Schweiger AI")
st.caption("Digital Twin | Executive Mode")

with st.sidebar:
    st.caption("**Systemsteuerung**")
    st.markdown("---")
    
    # Kontextwahl
    context_mode = st.radio(
        "Kontext-Override",
        ["Auto-Detect", "Business", "Privat", "Brand"],
        index=0,
        help="Auto-Detect erkennt den Kontext automatisch"
    )
    
    st.markdown("---")
    
    if st.button("🔄 Reset Memory", type="secondary", use_container_width=True):
        st.session_state.messages = []
        st.session_state.audio_processed = False
        st.rerun()
    
    st.markdown("---")
    st.caption("**Mike DNA:**")
    st.caption("• Zahlen > Meinungen")
    st.caption("• Klarheit > Harmonie")
    st.caption("• Praxis > Theorie")

# --- 6. SESSION STATE INIT ---
if "messages" not in st.session_state:
    st.session_state.messages = []
if "audio_processed" not in st.session_state:
    st.session_state.audio_processed = False

# --- 7. CHAT HISTORY ---
for message in st.session_state.messages:
    avatar = "🎯" if message["role"] == "assistant" else "👤"
    with st.chat_message(message["role"], avatar=avatar):
        st.markdown(message["content"])

# --- 8. INPUT BEREICH (ChatGPT-Style) ---
# Container für Audio + Text Input
input_container = st.container()

with input_container:
    col1, col2 = st.columns([6, 1])
    
    with col1:
        text_input = st.chat_input("Input für Mike...")
    
    with col2:
        st.markdown("<div style='margin-top: 8px;'>", unsafe_allow_html=True)
        audio_bytes = audio_recorder(
            text="",
            recording_color="#e74c3c",
            neutral_color="#3498db",
            icon_name="microphone",
            icon_size="2x",
            pause_threshold=2.0,
            sample_rate=16000,
        )
        st.markdown("</div>", unsafe_allow_html=True)

# --- 9. AUDIO PROCESSING ---
if audio_bytes and not st.session_state.audio_processed:
    st.session_state.audio_processed = True
    
    with st.spinner("🎤 Transkribiere Audio..."):
        transcribed_text = transcribe_audio(audio_bytes)
        
        if not transcribed_text.startswith("⚠️"):
            # User Message hinzufügen
            st.session_state.messages.append({
                "role": "user", 
                "content": f"🎤 {transcribed_text}"
            })
            
            # Antwort generieren
            response = generate_response(transcribed_text, context_mode)
            
            st.session_state.messages.append({
                "role": "assistant",
                "content": response
            })
            
            st.rerun()
        else:
            st.error(transcribed_text)
            st.session_state.audio_processed = False

# Audio processed flag zurücksetzen wenn kein neues Audio
if not audio_bytes:
    st.session_state.audio_processed = False

# --- 10. TEXT INPUT PROCESSING ---
if text_input:
    # User Message
    st.session_state.messages.append({"role": "user", "content": text_input})
    
    with st.chat_message("user", avatar="👤"):
        st.markdown(text_input)
    
    # Assistant Response
    with st.chat_message("assistant", avatar="🎯"):
        with st.spinner("💭"):
            response = generate_response(text_input, context_mode)
            st.markdown(response)
    
    st.session_state.messages.append({"role": "assistant", "content": response})
    st.rerun()