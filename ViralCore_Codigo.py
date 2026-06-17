from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
import sys
import os
from dotenv import load_dotenv
from openai import OpenAI
import pdfplumber
import json
import openpyxl

# Cargar variables de entorno
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Inicializar cliente de Groq (API compatible con OpenAI)
groq_client = None
if GROQ_API_KEY and GROQ_API_KEY != "INGRESA_TU_API_KEY_AQUI":
    try:
        groq_client = OpenAI(
            api_key=GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1"
        )
        print("[OK] Cliente Groq inicializado correctamente.")
    except Exception as e:
        print(f"[ERROR] Error al inicializar Groq: {e}")

# Modelo a utilizar (Llama 3.3 70B - comparable a GPT-4, 100% gratuito)
MODEL_NAME = "llama-3.3-70b-versatile"

# 1. Inicializamos el servidor de Flask
app = Flask(__name__)
CORS(app)

# 2. Conexión a MongoDB Atlas
URI_ATLAS = "mongodb+srv://harveynico04_db_user:amoalgoat@cluster0.tdfywti.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

try:
    cliente = MongoClient(URI_ATLAS)
    cliente.admin.command('ping')
    print("[OK] Conectado a MongoDB Atlas.")
except Exception as e:
    print("[ERROR] Error conectando a MongoDB:", e)
    sys.exit(1)

db = cliente['ViraCore_Infecciones']
coleccion_patogenos = db['patogenos']

# --- RUTAS DE LA API ---

# 1. Autenticación Simple de Administrador
@app.route('/api/auth', methods=['POST'])
def login_admin():
    datos = request.json
    password = datos.get('password')
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
        datos.pop('_id', None)
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

# 6. Chatbot con IA (Llama 3.3 70B via Groq - Gratuito)
@app.route('/api/chat', methods=['POST'])
def chat_ai():
    try:
        datos = request.json
        mensaje_usuario = datos.get('mensaje', '').strip()

        if not mensaje_usuario:
            return jsonify({"success": False, "respuesta": "No se recibió ningún mensaje."}), 400

        if not groq_client:
            return jsonify({"success": False, "respuesta": "Error: La API Key de Groq no está configurada en el servidor."}), 500

        # Obtener todos los patógenos para dar contexto a la IA
        todos_patogenos = list(coleccion_patogenos.find({}, {"_id": 0}))

        system_prompt = (
            "Eres el Asistente Experto en Bioseguridad de ViralCore, una aplicación médica profesional. "
            "Respondés preguntas sobre protocolos de aislamiento hospitalario, Equipo de Protección Personal (EPP), "
            "manejo de residuos patológicos, y supervivencia de microorganismos en superficies. "
            "REGLA DE ORO: Basá TODAS tus respuestas en la base de datos de ViralCore que se te provee. "
            "Si el usuario pregunta sobre un patógeno que está en la base de datos, citá información exacta (EPP, cartel de aislamiento, etc.). "
            "Respondé siempre en español. Usá un tono profesional pero amigable. "
            "Si la información no está en la base de datos, decilo claramente en lugar de inventar.\n\n"
            f"BASE DE DATOS DE VIRALCORE:\n{json.dumps(todos_patogenos, ensure_ascii=False, indent=2)}\n"
        )

        completion = groq_client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": mensaje_usuario}
            ],
            temperature=0.3,
            max_tokens=1500
        )

        respuesta = completion.choices[0].message.content
        return jsonify({"success": True, "respuesta": respuesta})

    except Exception as e:
        return jsonify({"success": False, "respuesta": f"Error del servidor de IA: {str(e)}"}), 500

# 7. Procesar PDF de Protocolos Locales (Solo Admin)
@app.route('/api/upload-pdf', methods=['POST'])
def upload_pdf():
    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "message": "No se envió ningún archivo PDF."}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"success": False, "message": "Nombre de archivo vacío."}), 400

        if not groq_client:
            return jsonify({"success": False, "message": "Error: La API Key de Groq no está configurada."}), 500

        # Extraer texto del PDF
        pdf_text = ""
        with pdfplumber.open(file) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pdf_text += text + "\n"

        if not pdf_text.strip():
            return jsonify({"success": False, "message": "No se pudo extraer texto del PDF. Asegurate de que no sea un PDF escaneado."}), 400

        system_msg = "Eres un analista experto en protocolos hospitalarios de control de infecciones. Tu única tarea es analizar documentos y devolver JSON puro sin texto adicional."

        user_msg = (
            f"Analiza el siguiente texto extraído de un manual de protocolos hospitalarios:\n\n{pdf_text[:12000]}\n\n"
            "Extraé ÚNICAMENTE las reglas específicas, recomendaciones locales o normativas particulares para distintos microorganismos "
            "(ej: MRSA, KPC, Clostridium difficile, Tuberculosis, Influenza, etc.).\n\n"
            "Devolvé SOLO un JSON válido. El formato debe ser un diccionario donde la clave es el nombre del microorganismo "
            "en minúsculas y el valor es una lista de strings con las alertas.\n"
            'Ejemplo: {"staphylococcus aureus": ["Usar triple guante para MRSA"], "mycobacterium tuberculosis": ["Presión negativa obligatoria"]}'
        )

        completion = groq_client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg}
            ],
            temperature=0.0,
            max_tokens=2000
        )

        respuesta_texto = completion.choices[0].message.content.strip()
        # Limpiar posible formato Markdown del output
        if respuesta_texto.startswith("```"):
            respuesta_texto = respuesta_texto.split("```")[1]
            if respuesta_texto.startswith("json"):
                respuesta_texto = respuesta_texto[4:]
        respuesta_texto = respuesta_texto.strip()

        alertas = json.loads(respuesta_texto)

        # Actualizar los patógenos en MongoDB con las alertas locales
        patogenos_modificados = 0
        for nombre_patogeno, lista_alertas in alertas.items():
            resultado = coleccion_patogenos.update_many(
                {"nombre_cientifico": {"$regex": nombre_patogeno, "$options": "i"}},
                {"$set": {"alertas_locales": lista_alertas}}
            )
            patogenos_modificados += resultado.modified_count

        return jsonify({
            "success": True,
            "message": f"PDF procesado correctamente. Se actualizaron {patogenos_modificados} patógenos con normativa local.",
            "alertas": alertas
        })

    except json.JSONDecodeError as e:
        return jsonify({"success": False, "message": f"La IA no devolvió JSON válido. Intentá con otro PDF."}), 500
    except Exception as e:
        return jsonify({"success": False, "message": f"Error procesando PDF: {str(e)}"}), 500

# 8. Importar Excel (Admin)
@app.route('/api/import-excel', methods=['POST'])
def import_excel():
    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "message": "No se envió ningún archivo Excel."}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"success": False, "message": "Nombre de archivo vacío."}), 400

        wb = openpyxl.load_workbook(file, data_only=True)
        sheet = wb.active

        # Leer encabezados de la fila 1
        headers = [cell.value for cell in sheet[1]]
        
        patogenos_procesados = 0
        patogenos_nuevos = 0
        patogenos_actualizados = 0

        # Iterar a partir de la fila 2
        for row in sheet.iter_rows(min_row=2, values_only=True):
            if not row[0]: # Si no hay nombre científico, omitir
                continue
                
            # Crear diccionario usando mapeo manual a partir de headers
            # Aseguramos que existan las columnas, si no, texto vacío
            def get_val(header_name):
                try:
                    idx = headers.index(header_name)
                    return str(row[idx]) if row[idx] is not None else ""
                except ValueError:
                    return ""

            nombre_cientifico = get_val("Nombre Científico")
            
            patogeno_data = {
                "nombre_cientifico": nombre_cientifico,
                "clasificacion": {
                    "grupo_principal": get_val("Grupo"),
                    "subcategoria": get_val("Subcategoría")
                },
                "tipo_aislamiento": {
                    "nombre": get_val("Aislamiento (Nombre)"),
                    "color_cartel": get_val("Aislamiento (Color)"),
                    "descripcion_al_clic": get_val("Aislamiento (Descripción)"),
                    "advertencias_criticas": [a.strip() for a in get_val("Advertencias Críticas").split("|") if a.strip()]
                },
                "epp_requerido": [e.strip() for e in get_val("EPP Requerido").split("|") if e.strip()],
                "mecanismos_infeccion": [m.strip() for m in get_val("Mecanismos Infección").split("|") if m.strip()],
                "mecanismos_resistencia": [m.strip() for m in get_val("Mecanismos Resistencia").split("|") if m.strip()],
                "disposicion_sala": get_val("Disposición Sala"),
                "manejo_residuos_ropa": {
                    "basura": get_val("Manejo Residuos")
                },
                "instrucciones_familia": get_val("Instrucciones Familia")
            }

            # Upsert (Actualizar si existe, insertar si no)
            resultado = coleccion_patogenos.update_one(
                {"nombre_cientifico": nombre_cientifico},
                {"$set": patogeno_data},
                upsert=True
            )
            
            patogenos_procesados += 1
            if resultado.upserted_id:
                patogenos_nuevos += 1
            else:
                patogenos_actualizados += 1

        return jsonify({
            "success": True, 
            "message": f"Excel procesado. Nuevos: {patogenos_nuevos}, Actualizados: {patogenos_actualizados}."
        })

    except Exception as e:
        return jsonify({"success": False, "message": f"Error procesando Excel: {str(e)}"}), 500


# Punto de inicio
if __name__ == '__main__':
    print("\n" + "="*50)
    print("[OK] El servidor de ViralCore v2 esta encendido!")
    print("URL local: http://127.0.0.1:5000/api/patogenos")
    print("Presiona CTRL+C para apagarlo.")
    print("="*50 + "\n")
    app.run(debug=True, port=5000)