import streamlit as st
import os
import google.generativeai as genai
from dotenv import load_dotenv
from streamlit_mic_recorder import mic_recorder
import io

# --- 1. SETUP & CLEAN DESIGN ---
st.set_page_config(
    page_title="Mike Schweiger AI",
    layout="centered"
)

# Minimalistisches UI
st.markdown("""
    <style>
    .main { margin-top: -50px; }
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
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
        # Audio in temporäre Datei speichern
        audio_file = io.BytesIO(audio_bytes)
        
        # Gemini für Transkription nutzen
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Audio hochladen und transkribieren
        audio_file_obj = genai.upload_file(audio_file, mime_type="audio/wav")
        response = model.generate_content([
            "Transkribiere diese Audioaufnahme auf Deutsch. Gib nur den transkribierten Text zurück, ohne zusätzliche Kommentare.",
            audio_file_obj
        ])
        
        return response.text.strip()
    except Exception as e:
        return f"Transkriptionsfehler: {str(e)}"

# --- 4. UI ---
st.markdown("### Mike Schweiger AI")
st.caption("Digital Twin | Executive Mode")

with st.sidebar:
    st.caption("**Systemsteuerung**")
    st.markdown("---")
    
    # Kontextwahl für manuelle Steuerung (optional)
    context_mode = st.radio(
        "Kontext-Override",
        ["Auto-Detect", "Business", "Privat", "Brand"],
        index=0,
        help="Auto-Detect erkennt den Kontext automatisch aus deiner Anfrage"
    )
    
    st.markdown("---")
    
    # Spracheingabe aktivieren/deaktivieren
    voice_enabled = st.checkbox("🎤 Spracheingabe", value=True)
    
    st.markdown("---")
    
    if st.button("🔄 Reset Memory", type="secondary", use_container_width=True):
        st.session_state.messages = []
        st.rerun()
    
    st.markdown("---")
    st.caption("**Mike DNA:**")
    st.caption("• Zahlen > Meinungen")
    st.caption("• Klarheit > Harmonie")
    st.caption("• Praxis > Theorie")

# --- 5. CHAT ENGINE ---
if "messages" not in st.session_state:
    st.session_state.messages = []

# Chat History anzeigen
for message in st.session_state.messages:
    avatar = "🎯" if message["role"] == "assistant" else "👤"
    with st.chat_message(message["role"], avatar=avatar):
        st.markdown(message["content"])

# --- 6. INPUT-BEREICH (TEXT + VOICE) ---
col1, col2 = st.columns([5, 1])

with col1:
    text_input = st.chat_input("Input für Mike...")

with col2:
    if voice_enabled:
        audio = mic_recorder(
            start_prompt="🎤",
            stop_prompt="⏹️",
            just_once=False,
            use_container_width=True,
            key='recorder'
        )

# Voice Input verarbeiten
if voice_enabled and audio:
    with st.spinner("🎤 Transkribiere..."):
        transcribed_text = transcribe_audio(audio['bytes'])
        
        if not transcribed_text.startswith("Transkriptionsfehler"):
            st.session_state.messages.append({"role": "user", "content": transcribed_text})
            
            with st.chat_message("user", avatar="👤"):
                st.markdown(f"🎤 *{transcribed_text}*")
            
            # Antwort generieren
            with st.chat_message("assistant", avatar="🎯"):
                message_placeholder = st.empty()
                
                enhanced_prompt = transcribed_text
                if context_mode != "Auto-Detect":
                    enhanced_prompt = f"[KONTEXT: {context_mode.upper()}] {transcribed_text}"
                
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
                    
                    history = []
                    for msg in st.session_state.messages[-10:]:
                        if msg["role"] == "user":
                            history.append({"role": "user", "parts": [msg["content"]]})
                        else:
                            history.append({"role": "model", "parts": [msg["content"]]})
                    
                    chat = model.start_chat(history=history[:-1] if history else [])
                    response = chat.send_message(enhanced_prompt)
                    
                    message_placeholder.markdown(response.text)
                    st.session_state.messages.append({"role": "assistant", "content": response.text})
                    
                except Exception as e:
                    error_msg = f"**Systemfehler:** {str(e)}"
                    message_placeholder.error(error_msg)
        else:
            st.error(transcribed_text)

# Text Input verarbeiten
if text_input:
    st.session_state.messages.append({"role": "user", "content": text_input})
    with st.chat_message("user", avatar="👤"):
        st.markdown(text_input)

    with st.chat_message("assistant", avatar="🎯"):
        message_placeholder = st.empty()
        
        enhanced_prompt = text_input
        if context_mode != "Auto-Detect":
            enhanced_prompt = f"[KONTEXT: {context_mode.upper()}] {text_input}"
        
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
            
            history = []
            for msg in st.session_state.messages[-10:]:
                if msg["role"] == "user":
                    history.append({"role": "user", "parts": [msg["content"]]})
                else:
                    history.append({"role": "model", "parts": [msg["content"]]})
            
            chat = model.start_chat(history=history[:-1] if history else [])
            response = chat.send_message(enhanced_prompt)
            
            message_placeholder.markdown(response.text)
            st.session_state.messages.append({"role": "assistant", "content": response.text})
            
        except Exception as e:
            error_msg = f"**Systemfehler:** {str(e)}\n\n*Hinweis: Prüfe API-Key und Rate Limits.*"
            message_placeholder.error(error_msg)
            st.session_state.messages.append({"role": "assistant", "content": error_msg})