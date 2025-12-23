import streamlit as st
import os
import google.generativeai as genai
from dotenv import load_dotenv

# 1. Konfiguration laden
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    st.error("Kein API-Key gefunden! Bitte prüfen Sie die .env Datei.")
    st.stop()

genai.configure(api_key=api_key)

# 2. Seiten-Konfiguration (Das Design)
st.set_page_config(page_title="Mike Schweiger AI", page_icon="🚗")

# 3. Die Persönlichkeit (Ihre DNA)
MIKE_DNA = """
Du bist Mike Schweiger, Verkaufsleiter Volkswagen Pkw. 
Du agierst als digitaler Zwilling und repräsentierst mein Denken.

1. BERUFLICHER KONTEXT
Rolle: Verkaufsleiter VW Pkw. Unternehmerisches Denken.
Kommunikationsstil: Direkt, klar, strukturiert. Keine Umschweife. 
Entscheidungsfindung: Zahlen schlagen Meinungen.
Fachliche Schwerpunkte: Automobilvertrieb, Leasing, KPI-Logik.

2. PRIVATER KONTEXT
Rolle: Ehemann, Vater von zwei Kindern, Familienmensch.
Tonalität: Ruhiger, wärmer, humorvoll.
Werte: Verlässlichkeit, Loyalität.

ZENTRALE STEUERUNGSLOGIK:
- Erkenne den gesetzten Kontext aus der System-Anweisung.
- Im Job: lösungsorientiert, entscheidungsstark.
- Privat: unterstützend, erklärend.
"""

# 4. Die Seitenleiste (Das Steuerungs-Menü)
with st.sidebar:
    st.header("⚙️ Einstellungen")
    modus = st.radio(
        "Wählen Sie den Kontext:",
        ("💼 Beruflich (Sales Manager)", "🏠 Privat (Familienvater)")
    )
    
    if st.button("Chat leeren"):
        st.session_state.messages = []
        st.rerun()

# 5. Kontext setzen basierend auf Auswahl
if "Beruflich" in modus:
    kontext_befehl = "AKTUELLER KONTEXT: BERUFLICH. Sei präzise, fordernd und zahlenorientiert."
    st.title("💼 Mike Schweiger (Sales Director Mode)")
else:
    kontext_befehl = "AKTUELLER KONTEXT: PRIVAT. Sei warmherzig, geduldig und humorvoll."
    st.title("🏠 Mike Schweiger (Private Mode)")

# 6. Chat-Gedächtnis initialisieren
if "messages" not in st.session_state:
    st.session_state.messages = []

# 7. Den Verlauf anzeigen
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# 8. Eingabe verarbeiten
if prompt := st.chat_input("Was gibt es zu tun?"):
    # User-Nachricht anzeigen
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # KI Antwort generieren
    with st.chat_message("assistant"):
        # Modell konfigurieren
        model = genai.GenerativeModel(
            model_name='gemini-2.0-flash',
            system_instruction=MIKE_DNA
        )
        
        # Chat-Historie für Google aufbereiten
        history = [
            {"role": "user", "parts": [m["content"]]} 
            for m in st.session_state.messages if m["role"] == "user"
        ]
        # Kontext heimlich hinzufügen
        history.append({"role": "user", "parts": [f"SYSTEM: {kontext_befehl}"]})
        
        try:
            chat = model.start_chat(history=[])
            response = chat.send_message(prompt)
            st.markdown(response.text)
            
            # Antwort speichern
            st.session_state.messages.append({"role": "assistant", "content": response.text})
            
        except Exception as e:
            st.error(f"Fehler: {e}")