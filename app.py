import streamlit as st
import os
import google.generativeai as genai
from dotenv import load_dotenv
import speech_recognition as sr
import io
import tempfile

# --- 1. SETUP & CLEAN DESIGN ---
st.set_page_config(
    page_title="Mike Schweiger AI",
    layout="centered"
)

# Minimalistisches UI - Fixed Input at Bottom
# HIER WURDE CSS ERGÄNZT, UM DIE AVATARE ZU ENTFERNEN
st.markdown("""
    <style>
    .main { 
        margin-top: -50px;
        padding-bottom: 180px;
    }
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
    /* --- AVATAR ENTFERNUNG --- */
    /* Blendet die runden Icons (Avatare) komplett aus */
    [data-testid="stChatMessageAvatar"] {
        display: none;
    }
    
    /* Fixed Input Container am unteren Rand */
    .stChatInputContainer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background-color: #0e1117;
        padding: 1rem;
        border-top: 1px solid #262730;
        z-index: 1000;
    }
    
    /* Chat Messages scrollbar */
    .stChatMessageContent {
        max-width: 100%;
    }
    
    /* Mobile Optimierung */
    @media (max-width: 768px) {
        .main {
            padding-bottom: 200px;
        }
        .stChatInputContainer {
            padding: 0.75rem;
        }
        .stButton button {
            width: 100%;
            padding: 0.75rem;
        }
    }
    
    /* Clean Button Style */
    .stButton button {
        background-color: #2c3e50;
        color: white;
        border: none;
        border-radius: 8px;
        transition: all 0.3s;
    }
    
    .stButton button:hover {
        background-color: #34495e;
    }
    
    /* Audio Input Styling */
    [data-testid="stAudioInput"] {
        background-color: #1e1e1e;
        border-radius: 8px;
        padding: 0.5rem;
    }
    
    /* File Uploader Styling */
    [data-testid="stFileUploader"] {
        background-color: #1e1e1e;
        border-radius: 8px;
        padding: 0.5rem;
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
        st.error("Setup-Fehler: API Key fehlt.")
        st.stop()

genai.configure(api_key=api_key)

# --- 2. OPTIMIERTE MIKE DNA (NO EMOJIS) ---
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

**Formatierung:**
- KEINE Emojis. Niemals. (Weder im Text noch in Überschriften).
- Bulletpoints statt Fließtext (außer in persönlichen Kontexten).
- Jede Aussage mit Zahlen/Fakten stützen.
- Keine Füllphrasen, keine Buzzwords ohne Substanz.

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
- KEINE Emojis verwenden.
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

# --- 3. SPEECH-TO-TEXT ---
def transcribe_audio_gemini(audio_data):
    """Gemini API Transkription"""
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
            tmp_file.write(audio_data)
            tmp_path = tmp_file.name
        
        audio_file = genai.upload_file(tmp_path, mime_type="audio/wav")
        response = model.generate_content([
            "Transkribiere diese Audioaufnahme auf Deutsch. Gib nur den transkribierten Text zurück, ohne zusätzliche Kommentare.",
            audio_file
        ])
        
        os.unlink(tmp_path)
        return response.text.strip()
    except Exception as e:
        return None

def transcribe_audio_google(audio_data):
    """Google Speech Recognition Fallback"""
    try:
        recognizer = sr.Recognizer()
        audio_io = io.BytesIO(audio_data)
        
        with sr.AudioFile(audio_io) as source:
            audio = recognizer.record(source)
            text = recognizer.recognize_google(audio, language="de-DE")
            return text
    except Exception as e:
        return None

def transcribe_audio(audio_data):
    """Kombinierte Transkription"""
    result = transcribe_audio_gemini(audio_data)
    if result:
        return result
    
    result = transcribe_audio_google(audio_data)
    if result:
        return result
    
    return "Transkription fehlgeschlagen. Bitte versuche es erneut."

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
        return f"Systemfehler: {str(e)}"

# --- 5. UI HEADER ---
st.markdown("### Mike Schweiger AI")
st.caption("Digital Twin | Executive Mode")

# --- 6. SIDEBAR ---
with st.sidebar:
    st.caption("Systemsteuerung")
    st.markdown("---")
    
    context_mode = st.radio(
        "Kontext-Override",
        ["Auto-Detect", "Business", "Privat", "Brand"],
        index=0
    )
    
    st.markdown("---")
    
    voice_method = st.selectbox(
        "Spracheingabe-Methode",
        ["Browser Native", "File Upload"],
        help="Browser Native nutzt Mikrofon direkt"
    )
    
    st.markdown("---")
    
    if st.button("Reset Memory", type="secondary", use_container_width=True):
        st.session_state.messages = []
        if 'audio_processed' in st.session_state:
            del st.session_state.audio_processed
        st.rerun()
    
    st.markdown("---")
    st.caption("Mike DNA:")
    st.caption("Zahlen > Meinungen")
    st.caption("Klarheit > Harmonie")
    st.caption("Praxis > Theorie")

# --- 7. SESSION STATE ---
if "messages" not in st.session_state:
    st.session_state.messages = []
if "audio_processed" not in st.session_state:
    st.session_state.audio_processed = False

# --- 8. CHAT HISTORY (scrollable) ---
chat_container = st.container()

with chat_container:
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

# --- 9. VOICE INPUT (above text input) ---
if voice_method == "Browser Native":
    audio_input = st.audio_input("Sprachnachricht aufnehmen")
    
    if audio_input and not st.session_state.audio_processed:
        st.session_state.audio_processed = True
        audio_bytes = audio_input.read()
        
        with st.spinner("Transkribiere..."):
            transcribed_text = transcribe_audio(audio_bytes)
            
            if not transcribed_text.startswith("Transkription fehlgeschlagen"):
                st.session_state.messages.append({
                    "role": "user",
                    "content": f"[Sprache] {transcribed_text}"
                })
                
                response = generate_response(transcribed_text, context_mode)
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": response
                })
                
                st.rerun()
            else:
                st.error(transcribed_text)
                st.session_state.audio_processed = False
    
    if not audio_input:
        st.session_state.audio_processed = False

else:
    uploaded_file = st.file_uploader(
        "Audiodatei hochladen",
        type=['wav', 'mp3', 'm4a', 'ogg'],
        label_visibility="collapsed"
    )
    
    if uploaded_file and not st.session_state.audio_processed:
        st.session_state.audio_processed = True
        audio_bytes = uploaded_file.read()
        
        with st.spinner("Transkribiere..."):
            transcribed_text = transcribe_audio(audio_bytes)
            
            if not transcribed_text.startswith("Transkription fehlgeschlagen"):
                st.session_state.messages.append({
                    "role": "user",
                    "content": f"[Sprache] {transcribed_text}"
                })
                
                response = generate_response(transcribed_text, context_mode)
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": response
                })
                
                st.rerun()
            else:
                st.error(transcribed_text)
                st.session_state.audio_processed = False
    
    if not uploaded_file:
        st.session_state.audio_processed = False

# --- 10. TEXT INPUT (Fixed at bottom) ---
text_input = st.chat_input("Nachricht an Mike...")

if text_input:
    st.session_state.messages.append({"role": "user", "content": text_input})
    
    with chat_container:
        with st.chat_message("user"):
            st.markdown(text_input)
        
        with st.chat_message("assistant"):
            with st.spinner("..."):
                response = generate_response(text_input, context_mode)
                st.markdown(response)
    
    st.session_state.messages.append({"role": "assistant", "content": response})
    st.rerun()