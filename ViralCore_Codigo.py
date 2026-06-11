from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
import sys
import os
from dotenv import load_dotenv
from google import genai
import pdfplumber
import json

# Cargar variables de entorno
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
gemini_client = None
if GEMINI_API_KEY and GEMINI_API_KEY != "INGRESA_TU_API_KEY_AQUI":
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
# 1. Inicializamos el servidor de Flask
app = Flask(__name__)
CORS(app) 

# 2. Conexión a MongoDB Atlas
URI_ATLAS = "mongodb+srv://harveynico04_db_user:amoalgoat@cluster0.tdfywti.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

try:
    cliente = MongoClient(URI_ATLAS)
    cliente.admin.command('ping')
except Exception as e:
    print("❌ Error conectando a MongoDB:", e)
    sys.exit(1)

db = cliente['ViraCore_Infecciones']
coleccion_patogenos = db['patogenos']

# --- RUTAS DE LA API ---

# 1. Autenticación Simple de Administrador
@app.route('/api/auth', methods=['POST'])
def login_admin():
    datos = request.json
    password = datos.get('password')
    # Clave simple según requerimiento
    if password == '6767':
        return jsonify({"success": True, "token": "admin-token-777"}), 200
    else:
        return jsonify({"success": False, "message": "Clave incorrecta"}), 401

# 2. Obtener patógenos (Para Médicos y Familias)
@app.route('/api/patogenos', methods=['GET'])
def buscar_patogenos():
    termino_busqueda = request.args.get('q', '')
    query = {}
    if termino_busqueda:
        query = {"nombre_cientifico": {"$regex": termino_busqueda, "$options": "i"}}
    
    resultados = coleccion_patogenos.find(query)
    
    patogenos = []
    for p in resultados:
        p['_id'] = str(p['_id']) 
        patogenos.append(p)
        
    return jsonify(patogenos)

# 3. Agregar un patógeno nuevo (Solo Admin)
@app.route('/api/patogenos', methods=['POST'])
def agregar_patogeno():
    nuevo_patogeno = request.json
    # Se inserta en MongoDB
    resultado = coleccion_patogenos.insert_one(nuevo_patogeno)
    nuevo_patogeno['_id'] = str(resultado.inserted_id)
    return jsonify({"success": True, "data": nuevo_patogeno}), 201

# 4. Eliminar un patógeno (Solo Admin)
@app.route('/api/patogenos/<id_patogeno>', methods=['DELETE'])
def eliminar_patogeno(id_patogeno):
    try:
        resultado = coleccion_patogenos.delete_one({"_id": ObjectId(id_patogeno)})
        if resultado.deleted_count == 1:
            return jsonify({"success": True, "message": "Patógeno eliminado"}), 200
        else:
            return jsonify({"success": False, "message": "Patógeno no encontrado"}), 404
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400

# 5. Editar un patógeno existente (Solo Admin)
@app.route('/api/patogenos/<id_patogeno>', methods=['PUT'])
def editar_patogeno(id_patogeno):
    try:
        datos = request.json
        datos.pop('_id', None)  # Nunca actualizamos el _id
        resultado = coleccion_patogenos.update_one(
            {"_id": ObjectId(id_patogeno)},
            {"$set": datos}
        )
        if resultado.matched_count == 1:
            return jsonify({"success": True}), 200
        else:
            return jsonify({"success": False, "message": "No encontrado"}), 404
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400

# 6. Chatbot con IA
@app.route('/api/chat', methods=['POST'])
def chat_ai():
    try:
        datos = request.json
        mensaje_usuario = datos.get('mensaje')
        
        if not gemini_client:
            return jsonify({"success": False, "respuesta": "Error: La API Key de Gemini no está configurada en el servidor. Por favor, añádela en el archivo .env."}), 500

        # Obtener patógenos de la base de datos para darle contexto al LLM
        todos_patogenos = list(coleccion_patogenos.find({}, {"_id": 0}))
        
        contexto_viralcore = "Eres el Asistente Experto en Bioseguridad de ViralCore. "
        contexto_viralcore += "Tu objetivo es responder de forma clara, profesional y directa preguntas sobre protocolos de aislamiento hospitalario, uso de Equipo de Protección Personal (EPP), manejo de residuos, y supervivencia de patógenos en superficies. "
        contexto_viralcore += "DEBES basar tus respuestas ESTRICTAMENTE en la base de datos de ViralCore que te proveo a continuación. "
        contexto_viralcore += "Si el usuario pregunta algo general, dale el paso a paso. Si pregunta sobre un patógeno específico, dale la información exacta (EPP, Cartel, etc.). "
        contexto_viralcore += "No inventes información externa. Si no sabes algo o no está en la base de datos, dilo claramente. Usa un tono amigable pero muy profesional.\n\n"
        contexto_viralcore += f"Base de datos actual de ViralCore:\n{str(todos_patogenos)}\n\n"
        
        prompt = contexto_viralcore + f"Pregunta del usuario: {mensaje_usuario}\nRespuesta:"
        
        response = gemini_client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt
        )
        
        return jsonify({"success": True, "respuesta": response.text})
    except Exception as e:
        return jsonify({"success": False, "respuesta": f"Error del servidor de IA: {str(e)}"}), 500

# 7. Procesar PDF de Protocolos Locales
@app.route('/api/upload-pdf', methods=['POST'])
def upload_pdf():
    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "message": "No se envió ningún archivo PDF."}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"success": False, "message": "Nombre de archivo vacío."}), 400
            
        if not gemini_client:
            return jsonify({"success": False, "message": "Error: La API Key de Gemini no está configurada."}), 500

        # Extraer texto del PDF
        pdf_text = ""
        with pdfplumber.open(file) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pdf_text += text + "\n"
                    
        # Consultar a Gemini para extraer reglas
        prompt = "Eres un analista experto en protocolos hospitalarios de control de infecciones. A continuación se presenta el texto extraído de un manual de protocolos local de un hospital en PDF:\n\n"
        prompt += pdf_text[:15000]
        prompt += "\n\nAnaliza este documento detalladamente y extrae ÚNICAMENTE las reglas específicas, recomendaciones locales, normativas particulares o diferencias en los protocolos de bioseguridad para distintos microorganismos o tipos de aislamiento (por ejemplo: MRSA, KPC, Clostridium difficile, Tuberculosis, Influenza, Aislamiento por Gotas, Aislamiento de Contacto, etc). "
        prompt += "Devuelve la respuesta ESTRICTAMENTE en formato JSON válido, que sea un diccionario donde la clave es el nombre del microorganismo (ej. 'staphylococcus aureus', 'clostridium difficile', 'klebsiella', 'mycobacterium tuberculosis') y el valor es un arreglo de strings (cada string es una alerta o normativa local encontrada para ese patógeno).\n"
        prompt += "No incluyas texto fuera del JSON. Ejemplo de salida esperada:\n{\n  \"staphylococcus aureus\": [\"En esta institución para MRSA se debe usar cofia y triple guante\", \"Aislamiento preventivo mínimo de 72hs\"],\n  \"clostridium difficile\": [\"Lavado estricto con clorhexidina 4% exclusivo\"]\n}\n"

        response = gemini_client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt
        )
        
        # Limpiar posible formato Markdown del output (```json ... ```)
        respuesta_texto = response.text.replace('```json', '').replace('```', '').strip()
        alertas = json.loads(respuesta_texto)
        
        # Actualizar los patógenos en MongoDB con las alertas locales
        patogenos_modificados = 0
        for nombre_patogeno, lista_alertas in alertas.items():
            # Buscar patógenos cuyo nombre contenga el nombre extraído
            resultado = coleccion_patogenos.update_many(
                {"nombre_cientifico": {"$regex": nombre_patogeno, "$options": "i"}},
                {"$set": {"alertas_locales": lista_alertas}}
            )
            patogenos_modificados += resultado.modified_count
            
        return jsonify({
            "success": True, 
            "message": f"PDF procesado correctamente por la IA. Se actualizaron las normativas de {patogenos_modificados} patógenos.", 
            "alertas": alertas
        })
    except json.JSONDecodeError:
        return jsonify({"success": False, "message": "Error: La IA no devolvió el formato JSON correctamente."}), 500
    except Exception as e:
        return jsonify({"success": False, "message": f"Error procesando PDF: {str(e)}"}), 500
# Punto de inicio
if __name__ == '__main__':
    print("\n" + "="*50)
    print("✅ ¡El servidor de ViralCore v2 está encendido!")
    print("🌐 Tu URL (API_URL) es: http://127.0.0.1:5000/api/patogenos")
    print("🛑 Presioná CTRL+C en esta consola para apagarlo.")
    print("="*50 + "\n")
    app.run(debug=True, port=5000)