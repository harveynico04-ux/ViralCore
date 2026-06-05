from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
import sys

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


# Punto de inicio
if __name__ == '__main__':
    print("\n" + "="*50)
    print("✅ ¡El servidor de ViralCore v2 está encendido!")
    print("🌐 Tu URL (API_URL) es: http://127.0.0.1:5000/api/patogenos")
    print("🛑 Presioná CTRL+C en esta consola para apagarlo.")
    print("="*50 + "\n")
    app.run(debug=True, port=5000)