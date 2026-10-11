import os
import pyttsx3
import sqlite3
from datetime import datetime
from ollama import Client

# 1. Block the hostel network from hijacking our local connection
os.environ['NO_PROXY'] = '127.0.0.1,localhost'

# Explicitly use the local loopback IP instead of 'localhost'
local_client = Client(host='http://127.0.0.1:11434')

# 2. Initialize Local SQLite Database
conn = sqlite3.connect('terra_memory.db')
cursor = conn.cursor()

cursor.execute('''
    CREATE TABLE IF NOT EXISTS interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        pet_request TEXT,
        status TEXT
    )
''')
conn.commit()

def get_terra_gotchi_craving():
    print("Waking up Terra-Gotchi locally...\n")
    
    # 3. Ask Gemma for a craving
    response = local_client.chat(
        model='gemma:2b',
        messages=[
            {
                'role': 'system',
                'content': "You are Terra-Gotchi, a digital pet that survives by eating real-world nature. Ask the user to go outside and find a specific natural visual texture or object for you to eat. Keep it to one short sentence."
            },
            {
                'role': 'user',
                'content': "What do you want to eat right now?"
            }
        ]
    )
    
    reply = response['message']['content']
    print(f"🌿 Terra-Gotchi says: {reply}")
    
    # 4. Save to local SQLite database
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute('''
        INSERT INTO interactions (timestamp, pet_request, status)
        VALUES (?, ?, ?)
    ''', (current_time, reply, "waiting_for_user"))
    
    conn.commit()
    print("[System] Memory securely saved to local SQLite database!")
    
    # 5. Speak out loud using local system voice
    print("[System] Speaking...")
    engine = pyttsx3.init()
    engine.say(reply)
    engine.runAndWait()

if __name__ == "__main__":
    get_terra_gotchi_craving()