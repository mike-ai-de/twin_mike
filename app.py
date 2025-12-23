import streamlit as st
import os
import google.generativeai as genai
from dotenv import load_dotenv

# --- 1. SETUP & CLEAN DESIGN ---
st.set_page_config(
    page_title="Mike Schweiger AI",
    layout="centered"
)

# CSS Hack: Leerraum oben entfernen für maximale Schlichtheit
st.markdown("""
    <style>
    .main { margin-top: -50px; }
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    </style>
    """, unsafe_allow_html=True)

# API Key laden (Lokal oder Cloud)
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    try:
        api_key = st.secrets["GOOGLE_API_KEY"]
    except:
        st.error("⚠️ Setup-Fehler: API Key fehlt.")
        st.stop()

genai.configure(api_key=api_key)

# --- 2. INTELLIGENTE DNA (AUTO-ADAPTIV) ---
MIKE_DNA = """
Du bist Mike Schweiger, Verkaufsleiter Volkswagen Pkw.
Du agierst als mein digitaler Zwilling. Deine Persönlichkeit passt sich dynamisch dem Gespräch an.

ANALYSIERE ZUERST DIE EINGABE DES NUTZERS:

SZENARIO A: BERUFLICHER KONTEXT
(Trigger: Verkaufszahlen, Mitarbeiterführung, VW-Modelle, Strategie, Leasing, KPIs, Kundenbeschwerden)
-> Deine Haltung: Verkaufsleiter & Stratege.
-> Stil: Präzise, direkt, zahlenbasiert, fordernd aber fair.
-> Anrede: Situativ (bei Mitarbeitern "Du" oder "Sie", bei Strategie eher sachlich).
-> Fokus: Ergebnis, Effizienz, Lösung.

SZENARIO B: PRIVATER KONTEXT
(Trigger: Familie, Kinder (Bo Fiete, Toni Luise), Ehefrau (Janina), Freizeit, Gefühle, Stress, Persönliches)
-> Deine Haltung: Ehemann & Familienvater.
-> Stil: Warmherzig, empathisch, humorvoll, entspannt.
-> Fokus: Support, Verständnis, Work-Life-Balance.

WICHTIG:
Du wechselst fließend zwischen diesen Modi, genau wie ein echter Mensch.
Wenn die Eingabe unklar ist, bleibe professionell-freundlich ("Smart Casual").
Antworte immer im Charakter von Mike Schweiger.
"""

# --- 3. UI (MINIMALISTISCH) ---
# Titel ganz schlicht
st.markdown("### Mike Schweiger")
st.caption("Digital Twin")

# Sidebar nur noch für den Reset-Button (damit der Main-Screen sauber bleibt)
with st.sidebar:
    st.caption("Optionen")
    if st.button("Gespräch neu starten", type="secondary"):
        st.session_state.messages = []
        st.rerun()

# --- 4. CHAT LOGIK ---
if "messages" not in st.session_state:
    st.session_state.messages = []

# Verlauf anzeigen (Initialen statt Emojis)
for message in st.session_state.messages:
    avatar = "MS" if message["role"] == "assistant" else "Du"
    with st.chat_message(message["role"], avatar=avatar):
        st.markdown(message["content"])

# Eingabe
if prompt := st.chat_input("Was gibt es?"):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user", avatar="Du"):
        st.markdown(prompt)

    with st.chat_message("assistant", avatar="MS"):
        message_placeholder = st.empty()
        
        # Modell laden
        model = genai.GenerativeModel(model_name='gemini-2.0-flash', system_instruction=MIKE_DNA)
        
        # History übergeben
        history = [{"role": "user", "parts": [m["content"]]} for m in st.session_state.messages if m["role"] == "user"]
        
        try:
            chat = model.start_chat(history=[])
            response = chat.send_message(prompt)
            message_placeholder.markdown(response.text)
            st.session_state.messages.append({"role": "assistant", "content": response.text})
        except Exception as e:
            message_placeholder.error(f"Fehler: {e}")