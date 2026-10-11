import os
import sqlite3
import base64
from datetime import datetime
from flask import Flask, render_template, jsonify, request
from ollama import Client

app = Flask(__name__)

# Proxy bypass for local Ollama instance
os.environ['NO_PROXY'] = '127.0.0.1,localhost'
local_client = Client(host='http://127.0.0.1:11434')

# Initialize SQLite database
def init_db():
    conn = sqlite3.connect('terra_memory.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS interactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            pet_request TEXT,
            status TEXT,
            image_path TEXT,
            verification_result TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/wake', methods=['GET'])
def wake_pet():
    try:
        response = local_client.chat(
            model='gemma:2b',
            messages=[
                {
                    'role': 'system',
                    'content': "You are Terra-Gotchi, a digital pet that survives by eating real-world nature. Ask the user to go outside and find a specific natural visual texture or object for you to eat (e.g., a green leaf, a rock, a flower). Keep it to one short sentence."
                },
                {
                    'role': 'user',
                    'content': "What do you want to eat right now?"
                }
            ]
        )
        
        reply = response['message']['content']
        
        conn = sqlite3.connect('terra_memory.db')
        cursor = conn.cursor()
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute('INSERT INTO interactions (timestamp, pet_request, status) VALUES (?, ?, ?)', 
                       (current_time, reply, "waiting_for_user"))
        conn.commit()
        conn.close()

        return jsonify({"message": reply})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/feed', methods=['POST'])
def feed_pet():
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image uploaded"}), 400
            
        file = request.files['image']
        craving = request.form.get('craving', 'nature item')

        # 1. Save the uploaded photo locally
        os.makedirs('static/uploads', exist_ok=True)
        filename = f"feed_{int(datetime.now().timestamp())}.jpg"
        filepath = os.path.join('static/uploads', filename)
        file.save(filepath)

        # 2. Read the image bytes for LLaVA
        with open(filepath, "rb") as image_file:
            image_bytes = image_file.read()

        # 3. Ask LLaVA to verify if the image matches the craving
        verify_response = local_client.chat(
            model='llava',
            messages=[
                {
                    'role': 'user',
                    'content': f'Look closely at this image. Does it clearly contain or show: "{craving}"? Answer with ONLY the word YES or NO.',
                    'images': [image_bytes]
                }
            ]
        )
        
        verification = verify_response['message']['content'].strip().upper()
        
        # 4. Have Gemma react based on LLaVA's verdict
        if "YES" in verification:
            system_prompt = "The user brought you exactly what you asked for! React with huge excitement in one short sentence thanking them."
            final_status = "fed_successfully"
        else:
            system_prompt = f"The user brought you the wrong item. You wanted '{craving}'. React with polite disappointment in one short sentence telling them to try again."
            final_status = "rejected_food"

        reaction = local_client.chat(
            model='gemma:2b',
            messages=[
                {
                    'role': 'system',
                    'content': system_prompt
                },
                {
                    'role': 'user',
                    'content': "Here is the food I brought you!"
                }
            ]
        )
        
        reply = reaction['message']['content']

        # 5. Update database record status
        conn = sqlite3.connect('terra_memory.db')
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE interactions 
            SET status = ?, image_path = ?, verification_result = ?
            WHERE id = (SELECT MAX(id) FROM interactions)
        ''', (final_status, filepath, verification))
        conn.commit()
        conn.close()

        return jsonify({
            "message": reply,
            "status": final_status
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)