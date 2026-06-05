from pymongo import MongoClient
import sys

URI_ATLAS = "mongodb+srv://harveynico04_db_user:amoalgoat@cluster0.tdfywti.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

try:
    cliente = MongoClient(URI_ATLAS)
    cliente.admin.command('ping')
except Exception as e:
    print("❌ Error conectando a MongoDB:", e)
    sys.exit(1)

db = cliente['ViraCore_Infecciones']
coleccion_patogenos = db['patogenos']

print("Borrando datos anteriores...")
coleccion_patogenos.delete_many({})

patogenos_datos = []

# --- Aislimiento de CONTACTO ---
aislamiento_contacto = {
    "nombre": "Contacto", "color_cartel": "Amarillo",
    "descripcion_al_clic": "Previene la propagación de infecciones transmitidas por contacto directo o indirecto.",
    "advertencias_criticas": ["Lavado de manos estricto.", "Uso de guantes y camisolín al entrar a la habitación."]
}
epp_contacto = ["Guantes", "Camisolín", "Lavado de manos"]
mecanismo_contacto = ["Contacto directo con el paciente o superficies"]
cuidados_familia_contacto = "Su familiar tiene un germen que se transmite al tocarlo a él o a las cosas de la habitación. Por favor, lávese muy bien las manos con agua y jabón antes de entrar y al salir. No toque heridas ni vendajes. No se siente en la cama del paciente. Use el camisolín y guantes que le indique la enfermera."

patogenos_contacto = [
    "Enterobacterias productoras de carbapenemasas", "Diarrea", "Rotavirus", "Norovirus", 
    "Shigella", "Staphilococcus aureus meticilin-resistente", "Enterobacterias productoras de BLEE", 
    "Enterococo vancomicina-resistente", "Quemadura o de herida por Streptococcus grupo A", 
    "Pediculosis", "Escabiosis", "Difteria cutánea", "Conjuntivitis viral hemorrágica"
]

for p in patogenos_contacto:
    patogenos_datos.append({
        "nombre_cientifico": p,
        "tipo_aislamiento": aislamiento_contacto,
        "epp_requerido": epp_contacto,
        "mecanismos_infeccion": mecanismo_contacto,
        "cuidados_familia": cuidados_familia_contacto
    })

# --- Aislamiento RESPIRATORIO AÉREO ---
aislamiento_aereo = {
    "nombre": "Respiratorio (Aéreo)", "color_cartel": "Azul",
    "descripcion_al_clic": "Prevención de transmisión de partículas pequeñas que permanecen suspendidas en el aire.",
    "advertencias_criticas": ["Habitación con puerta cerrada.", "Uso de barbijo N95 obligatorio antes de ingresar."]
}
epp_aereo = ["Barbijo N95 (respirador)", "Lavado de manos"]
mecanismo_aereo = ["Aérea (aerosoles suspendidos en el aire)"]
cuidados_familia_aereo = "Su familiar tiene una infección que puede quedar suspendida en el aire. Es OBLIGATORIO que use un barbijo especial (N95) todo el tiempo que esté en la habitación. Mantenga la puerta siempre cerrada. Lávese las manos al entrar y al salir."

patogenos_aereo = ["Tuberculosis", "Hantavirus cepa Andes", "Varicela", "Herpes zozter diseminado", "Sarampión"]

for p in patogenos_aereo:
    patogenos_datos.append({
        "nombre_cientifico": p,
        "tipo_aislamiento": aislamiento_aereo,
        "epp_requerido": epp_aereo,
        "mecanismos_infeccion": mecanismo_aereo,
        "cuidados_familia": cuidados_familia_aereo
    })

# --- Aislamiento por GOTAS ---
aislamiento_gotas = {
    "nombre": "Gotas de Pflugge", "color_cartel": "Verde",
    "descripcion_al_clic": "Enfermedades transmitidas por partículas respiratorias grandes que caen a menos de 1 metro.",
    "advertencias_criticas": ["Uso de barbijo quirúrgico al estar a menos de 1 metro.", "Higiene de manos estricta."]
}
epp_gotas = ["Barbijo quirúrgico", "Lavado de manos"]
mecanismo_gotas = ["Gotitas respiratorias al hablar, toser o estornudar"]
cuidados_familia_gotas = "Su familiar tiene una infección que se transmite por gotitas al toser o hablar de cerca. Debe usar barbijo común quirúrgico siempre que esté cerca (a menos de 1 metro) del paciente. Lávese muy bien las manos al salir de la habitación."

patogenos_gotas = [
    "Enfermedad por Streptococcus grupo A en niños", "Influenza \"A\" y \"B\"", 
    "Enfermedad invasiva por Neisseria meningitidis", "Enfermedad invasiva por Haemeophilus Influenzae tipo B", 
    "Parotiditis", "Tos Ferina", "Difteria Faringea", "Rubeóla"
]

for p in patogenos_gotas:
    patogenos_datos.append({
        "nombre_cientifico": p,
        "tipo_aislamiento": aislamiento_gotas,
        "epp_requerido": epp_gotas,
        "mecanismos_infeccion": mecanismo_gotas,
        "cuidados_familia": cuidados_familia_gotas
    })

print(f"Insertando {len(patogenos_datos)} patógenos...")
coleccion_patogenos.insert_many(patogenos_datos)
print("✅ Base de datos poblada exitosamente.")
