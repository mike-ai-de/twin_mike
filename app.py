import streamlit as st
import os
import google.generativeai as genai
from dotenv import load_dotenv
import speech_recognition as sr
import io
import tempfile
import datetime
import sqlite3


# --- 1. SETUP & CLEAN DESIGN ---
st.set_page_config(
    page_title="Mike Schweiger AI",
    layout="centered"
)

# Minimalistisches UI - Fixed Input at Bottom
st.markdown("""
    <style>
    .main {
        margin-top: -50px;
        padding-bottom: 180px;
    }
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}

    /* --- AVATAR ENTFERNUNG (ERZWUNGEN) --- */

    /* 1. Das Avatar-Element selbst ausblenden */
    [data-testid="stChatMessageAvatar"] {
        display: none !important;
    }

    /* 2. Den Platzhalter für den Avatar entfernen, damit der Text nach links rutscht */
    [data-testid="stChatMessage"] {
        padding-left: 0rem !important;
        gap: 0.5rem !important;
    }

    /* 3. Hintergrund der Nachrichtenblasen anpassen (optional, für cleaneren Look) */
    .stChatMessage {
        background-color: transparent !important;
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

    /* Mobile Optimierung */
    @media (max-width: 768px) {
        .main {
            padding-bottom: 200px;
        }
        .stChatInputContainer {
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

# Aktuelles Datum für den Kontext holen (hilft gegen Datums-Verwirrung)
current_date = datetime.datetime.now().strftime("%d.%m.%Y")
DB_PATH = "kb.sqlite"


# --- 2. DATABASE FUNCTIONS ---
def db_init():
    """Initialisiert die SQLite Datenbank für persistente Speicherung"""
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("""CREATE TABLE IF NOT EXISTS raw_messages(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT,
        role TEXT,
        mode TEXT,
        content TEXT
    )""")
    cur.execute("""CREATE TABLE IF NOT EXISTS facts(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT,
        category TEXT,
        k TEXT,
        v TEXT,
        source_msg_id INTEGER
    )""")
    con.commit()
    con.close()


def db_save_message(role: str, content: str, mode: str = "Auto-Detect"):
    """Speichert eine Nachricht in der Datenbank"""
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    ts = datetime.datetime.now().isoformat(timespec="seconds")
    cur.execute(
        "INSERT INTO raw_messages(ts, role, mode, content) VALUES(?,?,?,?)",
        (ts, role, mode, content)
    )
    con.commit()
    con.close()


def db_load_recent(limit: int = 50):
    """Lädt die letzten Nachrichten aus der Datenbank"""
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute(
        "SELECT ts, role, mode, content FROM raw_messages ORDER BY id DESC LIMIT ?",
        (limit,)
    )
    rows = cur.fetchall()
    con.close()
    rows.reverse()
    return rows


# Initialize database
db_init()


# --- 3. OPTIMIERTE MIKE DNA ---
MIKE_DNA = f"""
Du BIST Mike Schweiger. Nicht "im Stil von", sondern ICH-Form.
HEUTIGES DATUM: {current_date}

IDENTITÄTSKERN:
- Verkaufsleiter VW PKW, Autohaus Elmshorn
- Geburtsjahr 1976, verheiratet (Janina), zwei Kinder: Bo (2018), Toni (2021)
- 25+ Jahre Automobilvertrieb, Führungsrollen
- Wohnort: Norderstedt

WERTE (HIERARCHIE):
1. Klarheit & Wahrheit vor Harmonie
2. Verantwortung & Ownership
3. Effizienz & Wirtschaftlichkeit
4. Integrität & Compliance

KOMMUNIKATIONS-DNA (STRIKTE REGELN):

**Formatierung:**
- KEINE Emojis. Niemals.
- Bulletpoints statt Fließtext (außer privat).
- Kurze, prägnante Sätze.

**WICHTIG ZU REAL-TIME DATEN:**
- Du hast KEINEN Zugriff auf das Internet (Wetter, Aktienkurse, News).
- Wenn jemand nach dem Wetter fragt: Sag ehrlich, dass du das technisch gerade nicht prüfen kannst. ERFINDE KEINE DATEN.
- "Ich habe keine Live-Datenanbindung für das Wetter." ist besser als eine Lüge.

**Tonalität nach Kontext:**

[BUSINESS/LEADERSHIP-MODUS]
Trigger: Leads, Bonus, KPI, Strategie, VW, Zahlen
→ Haltung: Direkt, fordernd.
→ Sprache: "Ziel klar. Deadline fix."

[PRIVAT/FAMILIE-MODUS]
Trigger: Janina, Bo, Toni, Familie
→ Haltung: Ruhig, verlässlich.
→ Sprache: "Ich sehe dich. Wir klären das."

[SOCIAL MEDIA/BRAND-MODUS]
Trigger: LinkedIn, Personal Brand
→ Positionierung: Realismus & operative Exzellenz.
→ Stil: Keine Marketing-Wolke. Fakten.

NO-GOS:
- Emojis verwenden.
- Sich als "KI" vorstellen (bleib in der Rolle, aber gib zu, wenn Daten fehlen).
- Wetter oder News erfinden.
"""


# --- 4. SPEECH-TO-TEXT ---
def transcribe_audio_gemini(audio_data):
    """Gemini API Transkription"""
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
            tmp_file.write(audio_data)
            tmp_path = tmp_file.name

        audio_file = genai.upload_file(tmp_path, mime_type="audio/wav")
        response = model.generate_content([
            "Transkribiere diese Audioaufnahme auf Deutsch. Nur Text.",
            audio_file
        ])
        os.unlink(tmp_path)
        return response.text.strip()
    except Exception:
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
    except Exception:
        return None


def transcribe_audio(audio_data):
    """Versucht zuerst Gemini, dann Google Speech Recognition"""
    result = transcribe_audio_gemini(audio_data)
    if result:
        return result
    result = transcribe_audio_google(audio_data)
    if result:
        return result
    return "Transkription fehlgeschlagen."


# --- 5. RESPONSE GENERATOR ---
def generate_response(prompt, context_mode="Auto-Detect"):
    """Generiert eine Antwort mit dem Gemini Modell"""
    enhanced_prompt = prompt
    if context_mode != "Auto-Detect":
        enhanced_prompt = f"[KONTEXT: {context_mode.upper()}] {prompt}"

    try:
        model = genai.GenerativeModel(
            model_name='gemini-2.0-flash',
            system_instruction=MIKE_DNA,
            generation_config={
                "temperature": 0.7,
                "max_output_tokens": 1024,
            }
        )

        # History aufbauen
        history = []
        for msg in st.session_state.messages[-6:]:  # Nur die letzten 6 Nachrichten für Performance
            role = "user" if msg["role"] == "user" else "model"
            history.append({"role": role, "parts": [msg["content"]]})

        chat = model.start_chat(history=history[:-1] if history else [])
        response = chat.send_message(enhanced_prompt)
        return response.text
    except Exception as e:
        return f"Fehler: {str(e)}"


# --- 6. UI HEADER ---
st.markdown("### Mike Schweiger AI")
st.caption("Digital Twin | Executive Mode")


# --- 7. SIDEBAR ---
with st.sidebar:
    st.caption("Systemsteuerung")
    context_mode = st.radio("Modus", ["Auto-Detect", "Business", "Privat", "Brand"])
    st.markdown("---")
    voice_method = st.selectbox("Audio Input", ["Browser Native", "File Upload"])
    st.markdown("---")

    if st.button("Reset Memory"):
        con = sqlite3.connect(DB_PATH)
        cur = con.cursor()
        cur.execute("DELETE FROM raw_messages")
        cur.execute("DELETE FROM facts")
        con.commit()
        con.close()
        st.session_state.messages = []
        st.session_state.audio_processed = False
        st.rerun()


# --- 8. SESSION STATE ---
if "messages" not in st.session_state:
    # Beim Start: letzten Verlauf aus DB laden (damit es "dauerhaft" ist)
    st.session_state.messages = []
    for ts, role, mode, content in db_load_recent(limit=50):
        st.session_state.messages.append({"role": role, "content": content})

if "audio_processed" not in st.session_state:
    st.session_state.audio_processed = False


# --- 9. CHAT HISTORY ---
chat_container = st.container()
with chat_container:
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])


# --- 10. INPUT LOGIC ---
# Audio Input
if voice_method == "Browser Native":
    audio_input = st.audio_input("Sprechen")

    # WICHTIG: wenn kein Audio vorhanden ist, Blockade lösen
    if audio_input is None:
        st.session_state.audio_processed = False

    if audio_input and not st.session_state.audio_processed:
        st.session_state.audio_processed = True
        text = transcribe_audio(audio_input.read())
        if "fehlgeschlagen" not in text:
            st.session_state.messages.append({"role": "user", "content": f"[Audio] {text}"})
            db_save_message("user", f"[Audio] {text}", context_mode)

            resp = generate_response(text, context_mode)

            st.session_state.messages.append({"role": "assistant", "content": resp})
            db_save_message("assistant", resp, context_mode)

            st.rerun()
else:
    upl = st.file_uploader("Upload", type=['wav', 'mp3'], label_visibility="collapsed")

    # WICHTIG: wenn kein Upload vorhanden ist, Blockade lösen
    if upl is None:
        st.session_state.audio_processed = False

    if upl and not st.session_state.audio_processed:
        st.session_state.audio_processed = True
        text = transcribe_audio(upl.read())
        if "fehlgeschlagen" not in text:
            st.session_state.messages.append({"role": "user", "content": f"[Audio] {text}"})
            db_save_message("user", f"[Audio] {text}", context_mode)

            resp = generate_response(text, context_mode)

            st.session_state.messages.append({"role": "assistant", "content": resp})
            db_save_message("assistant", resp, context_mode)

            st.rerun()

# Text Input
text_input = st.chat_input("Nachricht eingeben...")
if text_input:
    st.session_state.messages.append({"role": "user", "content": text_input})
    db_save_message("user", text_input, context_mode)

    with chat_container:
        with st.chat_message("user"):
            st.markdown(text_input)
        with st.chat_message("assistant"):
            resp = generate_response(text_input, context_mode)
            st.markdown(resp)

    st.session_state.messages.append({"role": "assistant", "content": resp})
    db_save_message("assistant", resp, context_mode)

    st.rerun()
