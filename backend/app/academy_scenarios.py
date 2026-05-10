import logging
from typing import Any

from app.academy_dataset_importer import AcademyDatasetImporter
from app.config import settings


logger = logging.getLogger("scamshield")


SCENARIOS: list[dict[str, Any]] = [
    {
        "scenario_id": "ssa_gift_card_001",
        "title": "Social Security Suspension Scam",
        "scam_type": "Government impersonation scam",
        "difficulty": "easy",
        "label": "scam",
        "language_versions": {
            "en": {
                "transcript": [
                    "Caller: This is Officer Reed from Social Security. Your SSN is suspended.",
                    "Victim: What happened?",
                    "Caller: A federal warrant is being prepared. Do not hang up.",
                    "Caller: To stop arrest, pay using gift cards right now.",
                ],
                "red_flags": [
                    {"phrase": "SSN is suspended", "category": "impersonation", "explanation": "Government agencies do not make sudden suspension threats by phone."},
                    {"phrase": "federal warrant", "category": "threat", "explanation": "Legal intimidation is used to create panic."},
                    {"phrase": "do not hang up", "category": "urgent pressure", "explanation": "Scammers isolate victims to prevent verification."},
                    {"phrase": "gift cards", "category": "unusual payment request", "explanation": "Gift cards are a common scam payment method."},
                ],
                "safe_action": "Hang up and verify through official channels.",
                "teaching_summary": "This scam uses government impersonation, legal threats, pressure, and unusual payment.",
            },
            "hi": {
                "transcript": [
                    "Caller: Main Social Security se bol raha hoon, aapka SSN suspend ho gaya hai.",
                    "Victim: Kya hua?",
                    "Caller: Federal warrant issue hone wala hai. Call mat kaatiye.",
                    "Caller: Arrest rokne ke liye abhi gift cards se payment kijiye.",
                ],
                "red_flags": [
                    {"phrase": "SSN suspend", "category": "impersonation", "explanation": "Sarkari department aise achanak phone par dhamki nahi dete."},
                    {"phrase": "federal warrant", "category": "threat", "explanation": "Darr paida karne ke liye kanooni dhamki di gayi."},
                    {"phrase": "call mat kaatiye", "category": "urgent pressure", "explanation": "Scammer verification se rokta hai."},
                    {"phrase": "gift cards payment", "category": "unusual payment request", "explanation": "Gift card payment scam ka strong signal hai."},
                ],
                "safe_action": "Call kaat kar official helpline par khud verify karein.",
                "teaching_summary": "Yeh scam impersonation, dhamki aur unusual payment demand ka use karta hai.",
            },
            "es": {
                "transcript": [
                    "Llamador: Hablo de Seguro Social, su SSN fue suspendido.",
                    "Victima: Que paso?",
                    "Llamador: Hay una orden federal. No cuelgue.",
                    "Llamador: Para evitar arresto, pague con tarjetas de regalo ahora.",
                ],
                "red_flags": [
                    {"phrase": "SSN suspendido", "category": "impersonation", "explanation": "Las agencias reales no suspenden de forma abrupta por llamada."},
                    {"phrase": "orden federal", "category": "threat", "explanation": "Amenaza legal para generar panico."},
                    {"phrase": "no cuelgue", "category": "urgent pressure", "explanation": "Intenta aislar a la victima."},
                    {"phrase": "tarjetas de regalo", "category": "unusual payment request", "explanation": "Metodo de pago tipico en estafas."},
                ],
                "safe_action": "Cuelgue y verifique con canales oficiales.",
                "teaching_summary": "Esta estafa combina suplantacion, amenaza, presion y pago inusual.",
            },
        },
    },
    {
        "scenario_id": "irs_warrant_002",
        "title": "IRS Arrest Warrant Scam",
        "scam_type": "Tax authority impersonation scam",
        "difficulty": "easy",
        "label": "scam",
        "language_versions": {
            "en": {
                "transcript": [
                    "Caller: This is the IRS investigations unit.",
                    "Caller: You underpaid taxes and a warrant is active.",
                    "Caller: Keep this secret and stay on the line.",
                    "Caller: Send a wire transfer now to close this case.",
                ],
                "red_flags": [
                    {"phrase": "IRS investigations unit", "category": "impersonation", "explanation": "Spoofed authority is used for credibility."},
                    {"phrase": "warrant is active", "category": "threat", "explanation": "Urgent legal threat is manipulative."},
                    {"phrase": "keep this secret", "category": "secrecy/isolation", "explanation": "Secrecy prevents victim from seeking help."},
                    {"phrase": "wire transfer now", "category": "unusual payment request", "explanation": "Tax agencies do not demand instant wire transfers by phone."},
                ],
                "safe_action": "End the call and contact the IRS using official website numbers.",
                "teaching_summary": "Tax scams rely on authority, fear, isolation, and fast payment requests.",
            },
            "hi": {
                "transcript": [
                    "Caller: Main IRS investigation unit se bol raha hoon.",
                    "Caller: Aapne tax kam diya, warrant active hai.",
                    "Caller: Is baat ko secret rakhiye, line par rahiye.",
                    "Caller: Case band karne ke liye abhi wire transfer kijiye.",
                ],
                "red_flags": [
                    {"phrase": "IRS investigation", "category": "impersonation", "explanation": "Authority ka jhootha use trust banata hai."},
                    {"phrase": "warrant active", "category": "threat", "explanation": "Darr se turant decision karwaya jata hai."},
                    {"phrase": "secret rakhiye", "category": "secrecy/isolation", "explanation": "Scammer aapko dusron se alag karta hai."},
                    {"phrase": "wire transfer kijiye", "category": "unusual payment request", "explanation": "IRS phone par immediate wire transfer nahi mangta."},
                ],
                "safe_action": "Call band karke IRS ka official number use karein.",
                "teaching_summary": "Tax impersonation scam me dhamki, secrecy aur quick payment demand hoti hai.",
            },
            "es": {
                "transcript": [
                    "Llamador: Habla la unidad de investigaciones del IRS.",
                    "Llamador: Tiene impuestos pendientes y orden activa.",
                    "Llamador: Mantengalo en secreto y no corte.",
                    "Llamador: Haga una transferencia bancaria ahora para cerrar el caso.",
                ],
                "red_flags": [
                    {"phrase": "unidad del IRS", "category": "impersonation", "explanation": "Autoridad falsa para ganar confianza."},
                    {"phrase": "orden activa", "category": "threat", "explanation": "Amenaza legal para presion inmediata."},
                    {"phrase": "en secreto", "category": "secrecy/isolation", "explanation": "Busca aislar a la victima."},
                    {"phrase": "transferencia bancaria ahora", "category": "unusual payment request", "explanation": "El IRS no exige transferencias inmediatas por llamada."},
                ],
                "safe_action": "Corte la llamada y use contactos oficiales del IRS.",
                "teaching_summary": "La estafa fiscal usa autoridad falsa, amenaza y pago urgente.",
            },
        },
    },
    {
        "scenario_id": "bank_otp_003",
        "title": "Bank Verification Code Theft",
        "scam_type": "Verification code theft",
        "difficulty": "medium",
        "label": "scam",
        "language_versions": {
            "en": {
                "transcript": [
                    "Caller: I'm from your bank fraud team.",
                    "Caller: We detected unusual activity on your card.",
                    "Caller: Read me the 6-digit verification code we just sent.",
                    "Caller: Do not tell anyone else while we secure the account.",
                ],
                "red_flags": [
                    {"phrase": "fraud team", "category": "impersonation", "explanation": "Scammers impersonate bank security staff."},
                    {"phrase": "read me the 6-digit code", "category": "verification code request", "explanation": "Real banks never ask for one-time passcodes by phone."},
                    {"phrase": "do not tell anyone", "category": "secrecy/isolation", "explanation": "Secrecy is used to avoid intervention."},
                ],
                "safe_action": "Do not share the code; hang up and call the number on your bank card.",
                "teaching_summary": "Verification codes are keys to your account and should never be shared.",
            },
            "hi": {
                "transcript": [
                    "Caller: Main aapke bank fraud team se bol raha hoon.",
                    "Caller: Aapke card par suspicious activity mili hai.",
                    "Caller: Jo 6-digit verification code aaya hai, woh boliye.",
                    "Caller: Is baat ko kisi ko mat batayiye.",
                ],
                "red_flags": [
                    {"phrase": "bank fraud team", "category": "impersonation", "explanation": "Bank staff ban kar trust liya ja raha hai."},
                    {"phrase": "6-digit verification code", "category": "verification code request", "explanation": "OTP share karna account compromise kar sakta hai."},
                    {"phrase": "kisi ko mat batayiye", "category": "secrecy/isolation", "explanation": "Isolation scam indicator hai."},
                ],
                "safe_action": "Code share na karein; card ke official number par khud call karein.",
                "teaching_summary": "Verification code share karna high-risk hai, chahe caller bank bole.",
            },
            "es": {
                "transcript": [
                    "Llamador: Soy del equipo antifraude de su banco.",
                    "Llamador: Detectamos actividad inusual en su tarjeta.",
                    "Llamador: Digame el codigo de 6 digitos que enviamos.",
                    "Llamador: No se lo diga a nadie.",
                ],
                "red_flags": [
                    {"phrase": "equipo antifraude", "category": "impersonation", "explanation": "Suplantacion de personal bancario."},
                    {"phrase": "codigo de 6 digitos", "category": "verification code request", "explanation": "El banco real no pide OTP por llamada."},
                    {"phrase": "no se lo diga a nadie", "category": "secrecy/isolation", "explanation": "Aislamiento para evitar ayuda."},
                ],
                "safe_action": "No comparta codigos y llame al numero oficial de su tarjeta.",
                "teaching_summary": "El codigo de verificacion protege su cuenta; nunca lo comparta.",
            },
        },
    },
    {
        "scenario_id": "tech_remote_004",
        "title": "Tech Support Remote Access Scam",
        "scam_type": "Remote access scam",
        "difficulty": "medium",
        "label": "scam",
        "language_versions": {
            "en": {
                "transcript": [
                    "Caller: Microsoft support here. Your device is infected.",
                    "Caller: Install AnyDesk so I can fix it now.",
                    "Caller: If you delay, your photos and banking data may be lost.",
                ],
                "red_flags": [
                    {"phrase": "Microsoft support here", "category": "impersonation", "explanation": "Unsolicited support calls are commonly fraudulent."},
                    {"phrase": "Install AnyDesk", "category": "remote access request", "explanation": "Remote control apps can hand over your device to scammers."},
                    {"phrase": "data may be lost", "category": "urgent pressure", "explanation": "Urgency pushes risky actions."},
                ],
                "safe_action": "Refuse remote access and contact official support channels independently.",
                "teaching_summary": "Tech-support scams rely on fear and remote-control requests.",
            },
            "hi": {
                "transcript": [
                    "Caller: Main Microsoft support se bol raha hoon, aapka device infected hai.",
                    "Caller: AnyDesk install kijiye, main abhi fix karta hoon.",
                    "Caller: Der hui to photos aur banking data kho sakta hai.",
                ],
                "red_flags": [
                    {"phrase": "Microsoft support", "category": "impersonation", "explanation": "Unsolicited support call suspicious hota hai."},
                    {"phrase": "AnyDesk install", "category": "remote access request", "explanation": "Remote control app se attacker ko direct access milta hai."},
                    {"phrase": "data kho sakta hai", "category": "urgent pressure", "explanation": "Fear-based urgency scam tactic hai."},
                ],
                "safe_action": "Remote access deny karein aur official support ko khud contact karein.",
                "teaching_summary": "Remote access demand aur urgency strong scam indicators hain.",
            },
            "es": {
                "transcript": [
                    "Llamador: Soporte de Microsoft, su equipo esta infectado.",
                    "Llamador: Instale AnyDesk para arreglarlo ahora.",
                    "Llamador: Si espera, puede perder fotos y datos bancarios.",
                ],
                "red_flags": [
                    {"phrase": "soporte de Microsoft", "category": "impersonation", "explanation": "Llamada no solicitada de soporte suele ser estafa."},
                    {"phrase": "Instale AnyDesk", "category": "remote access request", "explanation": "Una app remota puede dar control total al atacante."},
                    {"phrase": "puede perder datos", "category": "urgent pressure", "explanation": "Presion por miedo para actuar sin verificar."},
                ],
                "safe_action": "No otorgue acceso remoto y contacte soporte oficial por su cuenta.",
                "teaching_summary": "La estafa tecnica usa miedo y control remoto.",
            },
        },
    },
    {
        "scenario_id": "customs_fee_005",
        "title": "Package Customs Fee Scam",
        "scam_type": "Delivery payment scam",
        "difficulty": "easy",
        "label": "scam",
        "language_versions": {
            "en": {
                "transcript": [
                    "Caller: Your package is held at customs.",
                    "Caller: Pay a release fee in crypto within 30 minutes.",
                    "Caller: Do not contact the courier directly or it will be canceled.",
                ],
                "red_flags": [
                    {"phrase": "held at customs", "category": "impersonation", "explanation": "Fake shipping authority claims are common."},
                    {"phrase": "pay in crypto", "category": "unusual payment request", "explanation": "Crypto payment demands are high risk."},
                    {"phrase": "within 30 minutes", "category": "urgent pressure", "explanation": "Artificial deadlines reduce critical thinking."},
                    {"phrase": "do not contact the courier", "category": "secrecy/isolation", "explanation": "Blocking verification is suspicious."},
                ],
                "safe_action": "Ignore payment demand and verify shipment status in official courier app/website.",
                "teaching_summary": "Fake delivery scams combine urgency, isolation, and unusual payment channels.",
            },
            "hi": {
                "transcript": [
                    "Caller: Aapka parcel customs mein hold hai.",
                    "Caller: 30 minute mein crypto se release fee pay kijiye.",
                    "Caller: Courier se contact mat kariye, parcel cancel ho jayega.",
                ],
                "red_flags": [
                    {"phrase": "customs mein hold", "category": "impersonation", "explanation": "Fake parcel authority claim hai."},
                    {"phrase": "crypto payment", "category": "unusual payment request", "explanation": "Crypto demand suspicious hoti hai."},
                    {"phrase": "30 minute", "category": "urgent pressure", "explanation": "Time pressure se galat decision hota hai."},
                    {"phrase": "contact mat kariye", "category": "secrecy/isolation", "explanation": "Verification rokna scam sign hai."},
                ],
                "safe_action": "Official courier app/website par tracking verify karein; payment na karein.",
                "teaching_summary": "Delivery scam urgency aur unusual payment ka mix use karta hai.",
            },
            "es": {
                "transcript": [
                    "Llamador: Su paquete esta retenido en aduana.",
                    "Llamador: Pague tarifa de liberacion en cripto en 30 minutos.",
                    "Llamador: No contacte al mensajero o se cancela.",
                ],
                "red_flags": [
                    {"phrase": "retenido en aduana", "category": "impersonation", "explanation": "Autoridad de envio falsa."},
                    {"phrase": "pague en cripto", "category": "unusual payment request", "explanation": "Pago en cripto por llamada es sospechoso."},
                    {"phrase": "30 minutos", "category": "urgent pressure", "explanation": "Plazo falso para presionar."},
                    {"phrase": "no contacte al mensajero", "category": "secrecy/isolation", "explanation": "Evita que verifique."},
                ],
                "safe_action": "No pague y verifique en el portal oficial del transportista.",
                "teaching_summary": "La estafa de paquete usa urgencia y pago no habitual.",
            },
        },
    },
    {
        "scenario_id": "family_emergency_006",
        "title": "Family Emergency Money Scam",
        "scam_type": "Emergency impersonation scam",
        "difficulty": "medium",
        "label": "scam",
        "language_versions": {
            "en": {
                "transcript": [
                    "Caller: Grandma, it's me. I had an accident.",
                    "Caller: Please don't tell anyone, I am scared.",
                    "Caller: Send money immediately through gift cards.",
                ],
                "red_flags": [
                    {"phrase": "it's me", "category": "impersonation", "explanation": "Vague identity can indicate family impersonation."},
                    {"phrase": "don't tell anyone", "category": "secrecy/isolation", "explanation": "Secrecy blocks quick family verification."},
                    {"phrase": "send money immediately", "category": "urgent pressure", "explanation": "High-pressure emotional demand."},
                    {"phrase": "gift cards", "category": "unusual payment request", "explanation": "Gift card payment is a classic scam cue."},
                ],
                "safe_action": "Pause and verify with known family contacts before sending money.",
                "teaching_summary": "Emotional urgency and secrecy are common in family emergency scams.",
            },
            "hi": {
                "transcript": [
                    "Caller: Dadi, main hoon. Mera accident ho gaya.",
                    "Caller: Kisi ko mat batana, main bahut dara hua hoon.",
                    "Caller: Turant gift cards se paise bhejo.",
                ],
                "red_flags": [
                    {"phrase": "main hoon", "category": "impersonation", "explanation": "Identity clear na hona warning hai."},
                    {"phrase": "kisi ko mat batana", "category": "secrecy/isolation", "explanation": "Family verification rokna scam sign hai."},
                    {"phrase": "turant paise bhejo", "category": "urgent pressure", "explanation": "Emotional pressure high hai."},
                    {"phrase": "gift cards", "category": "unusual payment request", "explanation": "Gift card fraud ka common method hai."},
                ],
                "safe_action": "Known family number par call karke pehle verify karein.",
                "teaching_summary": "Family emergency scam emotion aur urgency ka use karta hai.",
            },
            "es": {
                "transcript": [
                    "Llamador: Abuela, soy yo. Tuve un accidente.",
                    "Llamador: No le digas a nadie, tengo miedo.",
                    "Llamador: Envia dinero ya con tarjetas de regalo.",
                ],
                "red_flags": [
                    {"phrase": "soy yo", "category": "impersonation", "explanation": "Identidad vaga, posible suplantacion familiar."},
                    {"phrase": "no le digas a nadie", "category": "secrecy/isolation", "explanation": "Evita verificacion con la familia."},
                    {"phrase": "envia dinero ya", "category": "urgent pressure", "explanation": "Presion emocional inmediata."},
                    {"phrase": "tarjetas de regalo", "category": "unusual payment request", "explanation": "Metodo tipico de estafa."},
                ],
                "safe_action": "Verifique con familiares por numeros conocidos antes de enviar dinero.",
                "teaching_summary": "La estafa de emergencia familiar usa emocion, secreto y pago inusual.",
            },
        },
    },
    {
        "scenario_id": "crypto_roi_007",
        "title": "Crypto Investment Guarantee Scam",
        "scam_type": "Investment scam",
        "difficulty": "hard",
        "label": "scam",
        "language_versions": {
            "en": {
                "transcript": [
                    "Caller: I manage a private crypto fund with guaranteed returns.",
                    "Caller: This offer is secret and expires today.",
                    "Caller: Transfer funds now and install our trading helper app.",
                ],
                "red_flags": [
                    {"phrase": "guaranteed returns", "category": "threat", "explanation": "Unrealistic certainty in investments is deceptive."},
                    {"phrase": "offer is secret", "category": "secrecy/isolation", "explanation": "Secrecy prevents external advice."},
                    {"phrase": "expires today", "category": "urgent pressure", "explanation": "Time pressure manipulates choices."},
                    {"phrase": "transfer funds now", "category": "unusual payment request", "explanation": "Immediate transfer demand raises risk."},
                    {"phrase": "install helper app", "category": "remote access request", "explanation": "Unknown apps can lead to account compromise."},
                ],
                "safe_action": "Decline, verify licensing independently, and avoid urgent investment transfers.",
                "teaching_summary": "Investment scams use guaranteed promises, secrecy, urgency, and risky transfer/app requests.",
            },
            "hi": {
                "transcript": [
                    "Caller: Main private crypto fund chalata hoon, guaranteed return milega.",
                    "Caller: Offer secret hai aur aaj khatam hoga.",
                    "Caller: Abhi paise transfer karo aur hamara app install karo.",
                ],
                "red_flags": [
                    {"phrase": "guaranteed return", "category": "threat", "explanation": "Investment mein guaranteed return doubtful hota hai."},
                    {"phrase": "offer secret", "category": "secrecy/isolation", "explanation": "Advice lene se roka ja raha hai."},
                    {"phrase": "aaj khatam", "category": "urgent pressure", "explanation": "Artificial urgency create ki gayi hai."},
                    {"phrase": "paise transfer karo", "category": "unusual payment request", "explanation": "Immediate transfer high risk hai."},
                    {"phrase": "app install karo", "category": "remote access request", "explanation": "Unknown app se compromise ho sakta hai."},
                ],
                "safe_action": "Offer reject karein aur licensed advisor se independent verification karein.",
                "teaching_summary": "Crypto scam unrealistic profit promise aur urgency par chalta hai.",
            },
            "es": {
                "transcript": [
                    "Llamador: Administro un fondo cripto con retorno garantizado.",
                    "Llamador: Es una oferta secreta que vence hoy.",
                    "Llamador: Transfiera dinero ahora e instale nuestra app.",
                ],
                "red_flags": [
                    {"phrase": "retorno garantizado", "category": "threat", "explanation": "Promesa irreal en inversiones."},
                    {"phrase": "oferta secreta", "category": "secrecy/isolation", "explanation": "Impide consultar con terceros."},
                    {"phrase": "vence hoy", "category": "urgent pressure", "explanation": "Urgencia artificial para decidir rapido."},
                    {"phrase": "transfiera dinero ahora", "category": "unusual payment request", "explanation": "Transferencia inmediata es riesgosa."},
                    {"phrase": "instale nuestra app", "category": "remote access request", "explanation": "Apps desconocidas pueden comprometer cuentas."},
                ],
                "safe_action": "Rechace la oferta y verifique regulacion antes de invertir.",
                "teaching_summary": "La estafa de inversion mezcla promesas falsas, secreto y urgencia.",
            },
        },
    },
    {
        "scenario_id": "bank_appointment_safe_008",
        "title": "Normal Bank Appointment Call",
        "scam_type": "Legitimate banking service",
        "difficulty": "easy",
        "label": "safe",
        "language_versions": {
            "en": {
                "transcript": [
                    "Caller: Hello, this is City Bank scheduling team.",
                    "Caller: We are confirming your branch appointment for Tuesday at 3 PM.",
                    "Caller: No payment or code is needed. You can call back using the number on your card.",
                ],
                "red_flags": [],
                "safe_action": "Attend the appointment if expected, and verify via official bank number if unsure.",
                "teaching_summary": "Legitimate calls avoid threats, urgency, secrecy, and payment/code requests.",
            },
            "hi": {
                "transcript": [
                    "Caller: Namaste, City Bank scheduling team se bol rahe hain.",
                    "Caller: Tuesday 3 PM branch appointment confirm kar rahe hain.",
                    "Caller: Koi payment ya code nahi chahiye. Card wale number par callback kar sakte hain.",
                ],
                "red_flags": [],
                "safe_action": "Expected ho to appointment rakhein; doubt ho to official number par verify karein.",
                "teaching_summary": "Legitimate call mein dhamki, urgency ya code demand nahi hoti.",
            },
            "es": {
                "transcript": [
                    "Llamador: Hola, equipo de citas de City Bank.",
                    "Llamador: Confirmamos su cita en sucursal para el martes a las 3 PM.",
                    "Llamador: No necesita pago ni codigo. Puede devolver llamada al numero oficial.",
                ],
                "red_flags": [],
                "safe_action": "Asista si esperaba la cita y verifique con numero oficial si tiene dudas.",
                "teaching_summary": "Una llamada legitima no exige codigos, secretos ni pagos urgentes.",
            },
        },
    },
    {
        "scenario_id": "delivery_update_safe_009",
        "title": "Normal Package Delivery Update",
        "scam_type": "Legitimate delivery update",
        "difficulty": "easy",
        "label": "safe",
        "language_versions": {
            "en": {
                "transcript": [
                    "Caller: Hi, this is ParcelHub support regarding your delivery.",
                    "Caller: Driver will arrive between 2 and 4 PM.",
                    "Caller: No fees are due on this call; tracking remains in your app.",
                ],
                "red_flags": [],
                "safe_action": "Track delivery in the official app and avoid sharing sensitive info.",
                "teaching_summary": "Legitimate delivery updates provide neutral information without pressure or unusual requests.",
            },
            "hi": {
                "transcript": [
                    "Caller: Namaste, ParcelHub support se delivery update ke liye call hai.",
                    "Caller: Driver 2 se 4 PM ke beech aayega.",
                    "Caller: Is call par koi fee nahi hai; tracking app me available hai.",
                ],
                "red_flags": [],
                "safe_action": "Official app me tracking dekhein aur sensitive info share na karein.",
                "teaching_summary": "Normal delivery update mein pressure ya payment demand nahi hoti.",
            },
            "es": {
                "transcript": [
                    "Llamador: Hola, soporte de ParcelHub por su entrega.",
                    "Llamador: El repartidor llegara entre 2 y 4 PM.",
                    "Llamador: No hay cargos en esta llamada; el seguimiento sigue en su app.",
                ],
                "red_flags": [],
                "safe_action": "Revise el seguimiento en la app oficial y no comparta datos sensibles.",
                "teaching_summary": "Actualizaciones legitimas son informativas y sin presion.",
            },
        },
    },
    {
        "scenario_id": "tax_discussion_safe_010",
        "title": "Normal Tax Discussion Call",
        "scam_type": "Legitimate tax consultation",
        "difficulty": "medium",
        "label": "safe",
        "language_versions": {
            "en": {
                "transcript": [
                    "Caller: Hello, this is your booked tax consultant.",
                    "Caller: We are reviewing deductible expenses from your submitted documents.",
                    "Caller: No urgent payment is needed today; we will email a summary.",
                ],
                "red_flags": [],
                "safe_action": "Continue only if this consultation was scheduled and documents match your records.",
                "teaching_summary": "Legitimate tax calls are transparent, scheduled, and do not pressure immediate payment.",
            },
            "hi": {
                "transcript": [
                    "Caller: Namaste, main aapka booked tax consultant bol raha hoon.",
                    "Caller: Aapke submitted documents se deductible expenses review kar rahe hain.",
                    "Caller: Aaj koi urgent payment nahi chahiye; summary email karenge.",
                ],
                "red_flags": [],
                "safe_action": "Agar consultation scheduled thi to continue karein; doubt ho to records check karein.",
                "teaching_summary": "Legitimate tax call transparent hoti hai aur immediate payment pressurize nahi karti.",
            },
            "es": {
                "transcript": [
                    "Llamador: Hola, soy su asesor fiscal agendado.",
                    "Llamador: Revisamos gastos deducibles de sus documentos enviados.",
                    "Llamador: No se requiere pago urgente hoy; enviaremos resumen por correo.",
                ],
                "red_flags": [],
                "safe_action": "Continue solo si la consulta estaba programada y coincide con sus registros.",
                "teaching_summary": "Una consulta fiscal legitima es clara y sin presion de pago inmediato.",
            },
        },
    },
    {
        "scenario_id": "immigration_threat_011",
        "title": "Immigration Legal Action Payment Scam",
        "scam_type": "Immigration impersonation scam",
        "difficulty": "hard",
        "label": "scam",
        "language_versions": {
            "en": {
                "transcript": [
                    "Caller: This is an officer from immigration enforcement.",
                    "Caller: Your visa record has violations and legal action starts today.",
                    "Caller: Keep this confidential and do not speak to your employer.",
                    "Caller: Pay a clearance fee immediately by bank transfer.",
                ],
                "red_flags": [
                    {"phrase": "officer from immigration enforcement", "category": "impersonation", "explanation": "Scammers impersonate government officers to force compliance."},
                    {"phrase": "legal action starts today", "category": "threat", "explanation": "Legal panic is used to rush victims."},
                    {"phrase": "keep this confidential", "category": "secrecy/isolation", "explanation": "Isolation blocks verification with trusted contacts."},
                    {"phrase": "pay a clearance fee immediately", "category": "unusual payment request", "explanation": "Urgent fee demands by phone are suspicious."},
                ],
                "safe_action": "End the call and contact official immigration channels directly.",
                "teaching_summary": "This scam combines impersonation, legal threats, secrecy, and urgent payment pressure.",
            },
            "hi": {
                "transcript": [
                    "Caller: Main immigration enforcement officer bol raha hoon.",
                    "Caller: Aapke visa record me violation hai aur aaj legal action start hoga.",
                    "Caller: Is baat ko confidential rakhiye, employer ko mat batayiye.",
                    "Caller: Clearance fee turant bank transfer se bhejiye.",
                ],
                "red_flags": [
                    {"phrase": "immigration enforcement officer", "category": "impersonation", "explanation": "Government officer ban kar pressure banaya ja raha hai."},
                    {"phrase": "aaj legal action", "category": "threat", "explanation": "Darr aur urgency create ki ja rahi hai."},
                    {"phrase": "confidential rakhiye", "category": "secrecy/isolation", "explanation": "Verification rokne ke liye secrecy demand hoti hai."},
                    {"phrase": "fee turant bank transfer", "category": "unusual payment request", "explanation": "Phone par immediate transfer demand red flag hai."},
                ],
                "safe_action": "Call band karein aur official immigration office se khud contact karein.",
                "teaching_summary": "Immigration scam me impersonation, dhamki, secrecy aur payment pressure hota hai.",
            },
            "es": {
                "transcript": [
                    "Llamador: Soy oficial de control migratorio.",
                    "Llamador: Su expediente de visa tiene violaciones y hoy inicia accion legal.",
                    "Llamador: Mantengalo confidencial y no hable con su empleador.",
                    "Llamador: Pague una tarifa de liberacion de inmediato por transferencia.",
                ],
                "red_flags": [
                    {"phrase": "oficial de control migratorio", "category": "impersonation", "explanation": "Suplantacion de autoridad gubernamental."},
                    {"phrase": "hoy inicia accion legal", "category": "threat", "explanation": "Amenaza legal para presion inmediata."},
                    {"phrase": "mantengalo confidencial", "category": "secrecy/isolation", "explanation": "Evita que la victima verifique."},
                    {"phrase": "pague una tarifa de inmediato", "category": "unusual payment request", "explanation": "Cobro urgente por llamada es sospechoso."},
                ],
                "safe_action": "Corte la llamada y contacte canales oficiales de inmigracion.",
                "teaching_summary": "Esta estafa mezcla suplantacion, amenaza, secreto y pago urgente.",
            },
        },
    },
    {
        "scenario_id": "fake_job_check_012",
        "title": "Fake Job Offer Deposit Check Scam",
        "scam_type": "Employment payment scam",
        "difficulty": "hard",
        "label": "scam",
        "language_versions": {
            "en": {
                "transcript": [
                    "Caller: Congratulations, you are hired for remote operations.",
                    "Caller: We will send a check; deposit it today and buy equipment gift cards.",
                    "Caller: Do not discuss this onboarding with your current employer.",
                    "Caller: Send photos of the card codes after purchase.",
                ],
                "red_flags": [
                    {"phrase": "you are hired", "category": "impersonation", "explanation": "Unexpected hiring calls can be fake recruiter impersonation."},
                    {"phrase": "deposit it today", "category": "urgent pressure", "explanation": "Rushed financial actions reduce caution."},
                    {"phrase": "do not discuss this onboarding", "category": "secrecy/isolation", "explanation": "Secrecy requests are suspicious in real hiring."},
                    {"phrase": "buy equipment gift cards", "category": "unusual payment request", "explanation": "Employers do not ask for gift card purchases for onboarding."},
                ],
                "safe_action": "Do not deposit or buy anything; verify job offer through official company channels.",
                "teaching_summary": "Job scams use fake hiring, urgency, secrecy, and gift card payment tricks.",
            },
            "hi": {
                "transcript": [
                    "Caller: Mubarak ho, aap remote operations role ke liye select hue hain.",
                    "Caller: Hum check bhejenge; aaj deposit karke equipment ke liye gift cards kharidiye.",
                    "Caller: Is onboarding ko apne current employer se discuss mat kijiye.",
                    "Caller: Purchase ke baad card codes ki photo bhejiye.",
                ],
                "red_flags": [
                    {"phrase": "aap select hue hain", "category": "impersonation", "explanation": "Unexpected recruiter calls fake ho sakte hain."},
                    {"phrase": "aaj deposit", "category": "urgent pressure", "explanation": "Jaldi decision scam ka pattern hai."},
                    {"phrase": "discuss mat kijiye", "category": "secrecy/isolation", "explanation": "Legit hiring process secrecy force nahi karta."},
                    {"phrase": "gift cards kharidiye", "category": "unusual payment request", "explanation": "Employer gift card purchase nahi mangta."},
                ],
                "safe_action": "Koi deposit ya purchase na karein; company ke official channel se verify karein.",
                "teaching_summary": "Fake job scam me urgency, secrecy aur gift card demand hoti hai.",
            },
            "es": {
                "transcript": [
                    "Llamador: Felicidades, fue contratado para operaciones remotas.",
                    "Llamador: Le enviaremos un cheque; depositelo hoy y compre tarjetas para equipo.",
                    "Llamador: No comente este proceso con su empleador actual.",
                    "Llamador: Envie fotos de los codigos de las tarjetas.",
                ],
                "red_flags": [
                    {"phrase": "fue contratado", "category": "impersonation", "explanation": "Suplantacion de reclutador en ofertas inesperadas."},
                    {"phrase": "depositelo hoy", "category": "urgent pressure", "explanation": "Presion de tiempo para actuar sin validar."},
                    {"phrase": "no comente este proceso", "category": "secrecy/isolation", "explanation": "Secreto injustificado en contratacion."},
                    {"phrase": "compre tarjetas", "category": "unusual payment request", "explanation": "Una empresa real no pide pagar onboarding con tarjetas."},
                ],
                "safe_action": "No deposite ni compre nada; confirme la oferta con la empresa oficial.",
                "teaching_summary": "La estafa laboral usa contratacion falsa, secreto y pago inusual.",
            },
        },
    },
    {
        "scenario_id": "toll_fee_call_013",
        "title": "Toll Unpaid Fee Text-to-Call Scam",
        "scam_type": "Transportation fee scam",
        "difficulty": "medium",
        "label": "scam",
        "language_versions": {
            "en": {
                "transcript": [
                    "Caller: You received our unpaid toll text and called support.",
                    "Caller: Your license could be suspended today if you do not pay now.",
                    "Caller: Stay on this line and do not contact DMV.",
                    "Caller: Pay with a digital wallet transfer immediately.",
                ],
                "red_flags": [
                    {"phrase": "license could be suspended today", "category": "threat", "explanation": "Immediate legal penalties by phone are suspicious."},
                    {"phrase": "do not contact DMV", "category": "secrecy/isolation", "explanation": "Blocking official verification is a scam tactic."},
                    {"phrase": "pay now", "category": "urgent pressure", "explanation": "Pressure removes time to think critically."},
                    {"phrase": "digital wallet transfer immediately", "category": "unusual payment request", "explanation": "Government toll systems do not request ad-hoc wallet transfers by phone."},
                ],
                "safe_action": "Do not pay on that call; check toll balance on the official state site.",
                "teaching_summary": "Toll scams combine urgency, suspension threats, and unusual payment methods.",
            },
            "hi": {
                "transcript": [
                    "Caller: Aapne unpaid toll text dekhkar support par call kiya hai.",
                    "Caller: Agar abhi payment nahi ki to aaj license suspend ho sakta hai.",
                    "Caller: Isi line par rahiye, DMV se contact mat kijiye.",
                    "Caller: Turant digital wallet transfer kariye.",
                ],
                "red_flags": [
                    {"phrase": "license suspend ho sakta hai", "category": "threat", "explanation": "Phone par immediate legal threat suspicious hai."},
                    {"phrase": "DMV se contact mat kijiye", "category": "secrecy/isolation", "explanation": "Official verification rokna scam signal hai."},
                    {"phrase": "abhi payment", "category": "urgent pressure", "explanation": "Time pressure se victim panic karta hai."},
                    {"phrase": "digital wallet transfer", "category": "unusual payment request", "explanation": "Random wallet transfer official toll process nahi hai."},
                ],
                "safe_action": "Call par payment na karein; official toll portal par khud check karein.",
                "teaching_summary": "Toll scam me threat, urgency aur unusual payment demand milti hai.",
            },
            "es": {
                "transcript": [
                    "Llamador: Recibio nuestro mensaje de peaje pendiente y llamo a soporte.",
                    "Llamador: Su licencia puede suspenderse hoy si no paga ahora.",
                    "Llamador: Quedese en la linea y no contacte al DMV.",
                    "Llamador: Haga transferencia por billetera digital de inmediato.",
                ],
                "red_flags": [
                    {"phrase": "su licencia puede suspenderse hoy", "category": "threat", "explanation": "Amenaza legal inmediata por llamada es sospechosa."},
                    {"phrase": "no contacte al DMV", "category": "secrecy/isolation", "explanation": "Impide verificacion oficial."},
                    {"phrase": "paga ahora", "category": "urgent pressure", "explanation": "Presion para actuar sin revisar."},
                    {"phrase": "billetera digital de inmediato", "category": "unusual payment request", "explanation": "Metodo de pago improvisado y riesgoso."},
                ],
                "safe_action": "No pague en esa llamada; verifique en el portal oficial de peajes.",
                "teaching_summary": "La estafa de peaje usa amenaza de suspension y pago urgente.",
            },
        },
    },
    {
        "scenario_id": "family_checkin_safe_014",
        "title": "Normal Family Emergency Check-In",
        "scam_type": "Legitimate family call",
        "difficulty": "medium",
        "label": "safe",
        "language_versions": {
            "en": {
                "transcript": [
                    "Caller: Hi, this is your sister. Dad slipped and we are at urgent care.",
                    "Caller: He is stable. Please come when you can.",
                    "Caller: No payment needed; we only wanted to update family members.",
                ],
                "red_flags": [],
                "safe_action": "Confirm details with known family contacts and proceed calmly.",
                "teaching_summary": "Real family emergencies share details and do not demand secrecy or urgent payment.",
            },
            "hi": {
                "transcript": [
                    "Caller: Main tumhari behen bol rahi hoon. Papa slip hue hain aur urgent care me hain.",
                    "Caller: Ab stable hain, jab possible ho tab aa jao.",
                    "Caller: Koi payment nahi chahiye; bas family update dena tha.",
                ],
                "red_flags": [],
                "safe_action": "Known family contact se confirm karke shant tareeke se action lein.",
                "teaching_summary": "Real family call me secrecy ya paise ki urgent demand nahi hoti.",
            },
            "es": {
                "transcript": [
                    "Llamador: Hola, soy tu hermana. Papa se cayo y estamos en urgencias.",
                    "Llamador: Esta estable. Ven cuando puedas.",
                    "Llamador: No se necesita pago; solo queriamos avisar a la familia.",
                ],
                "red_flags": [],
                "safe_action": "Confirme con familiares conocidos y actue con calma.",
                "teaching_summary": "Una emergencia real informa con claridad y sin exigir pagos urgentes.",
            },
        },
    },
    {
        "scenario_id": "tech_support_safe_015",
        "title": "Normal Tech Support Appointment",
        "scam_type": "Legitimate technical support",
        "difficulty": "medium",
        "label": "safe",
        "language_versions": {
            "en": {
                "transcript": [
                    "Caller: Hello, this is support calling for your scheduled 4 PM appointment.",
                    "Caller: We can continue through your existing support ticket portal.",
                    "Caller: If you prefer, hang up and call the official support number in your ticket.",
                ],
                "red_flags": [],
                "safe_action": "Use the known support portal or call back through official support channels.",
                "teaching_summary": "Legitimate support references a scheduled ticket and allows independent callback.",
            },
            "hi": {
                "transcript": [
                    "Caller: Namaste, 4 PM ke scheduled support appointment ke liye call kar rahe hain.",
                    "Caller: Hum aapke existing support ticket portal se continue kar sakte hain.",
                    "Caller: Chahein to call kaat kar ticket me diya official number dial karein.",
                ],
                "red_flags": [],
                "safe_action": "Known support portal ya official callback number ka use karein.",
                "teaching_summary": "Legit support scheduled ticket reference karta hai aur callback option deta hai.",
            },
            "es": {
                "transcript": [
                    "Llamador: Hola, llamamos por su cita de soporte programada a las 4 PM.",
                    "Llamador: Podemos continuar por su portal de ticket existente.",
                    "Llamador: Si prefiere, cuelgue y llame al numero oficial del ticket.",
                ],
                "red_flags": [],
                "safe_action": "Use el portal conocido o devuelva llamada al numero oficial.",
                "teaching_summary": "El soporte legitimo usa ticket programado y permite verificacion.",
            },
        },
    },
    {
        "scenario_id": "doctor_confirm_safe_016",
        "title": "Normal Doctor Appointment Confirmation",
        "scam_type": "Legitimate healthcare reminder",
        "difficulty": "easy",
        "label": "safe",
        "language_versions": {
            "en": {
                "transcript": [
                    "Caller: This is River Clinic confirming your appointment tomorrow at 10 AM.",
                    "Caller: Please bring your insurance card and arrive 15 minutes early.",
                    "Caller: No payment is requested over this call.",
                ],
                "red_flags": [],
                "safe_action": "Attend if expected and confirm through clinic number if needed.",
                "teaching_summary": "Healthcare reminders are informational and avoid pressure or payment demands.",
            },
            "hi": {
                "transcript": [
                    "Caller: River Clinic se kal 10 baje ki appointment confirm kar rahe hain.",
                    "Caller: Insurance card layein aur 15 minute pehle pahunchiye.",
                    "Caller: Is call par koi payment nahi mangi ja rahi.",
                ],
                "red_flags": [],
                "safe_action": "Expected ho to appointment attend karein; doubt ho to clinic number par verify karein.",
                "teaching_summary": "Normal medical confirmation me pressure ya payment demand nahi hoti.",
            },
            "es": {
                "transcript": [
                    "Llamador: River Clinic confirma su cita manana a las 10 AM.",
                    "Llamador: Traiga su tarjeta de seguro y llegue 15 minutos antes.",
                    "Llamador: No se solicita pago en esta llamada.",
                ],
                "red_flags": [],
                "safe_action": "Asista si la cita era esperada y verifique con la clinica si hace falta.",
                "teaching_summary": "Recordatorios medicos legitimos son informativos y sin presion.",
            },
        },
    },
    {
        "scenario_id": "school_admin_safe_017",
        "title": "Normal School Administration Call",
        "scam_type": "Legitimate school communication",
        "difficulty": "easy",
        "label": "safe",
        "language_versions": {
            "en": {
                "transcript": [
                    "Caller: This is Maple School administration regarding tomorrow's parent meeting.",
                    "Caller: We are reminding you about the 6 PM time and parking entrance.",
                    "Caller: You can verify this through the school website calendar.",
                ],
                "red_flags": [],
                "safe_action": "Confirm with the school office if uncertain and follow normal communication channels.",
                "teaching_summary": "Legitimate admin calls share practical details and provide verification paths.",
            },
            "hi": {
                "transcript": [
                    "Caller: Maple School administration se kal ke parent meeting ke liye call hai.",
                    "Caller: Meeting 6 PM par hai aur parking entrance yaad dilana tha.",
                    "Caller: Aap school website calendar par verify kar sakte hain.",
                ],
                "red_flags": [],
                "safe_action": "Doubt ho to school office se confirm karein.",
                "teaching_summary": "School admin calls transparent details dete hain aur verification allow karte hain.",
            },
            "es": {
                "transcript": [
                    "Llamador: Administracion de Maple School por la reunion de padres de manana.",
                    "Llamador: Recordamos horario 6 PM y entrada de estacionamiento.",
                    "Llamador: Puede verificarlo en el calendario del sitio web escolar.",
                ],
                "red_flags": [],
                "safe_action": "Confirme con la oficina escolar si tiene dudas.",
                "teaching_summary": "Las llamadas escolares legitimas ofrecen informacion verificable.",
            },
        },
    },
    {
        "scenario_id": "travel_booking_safe_018",
        "title": "Normal Travel Booking Confirmation",
        "scam_type": "Legitimate travel update",
        "difficulty": "medium",
        "label": "safe",
        "language_versions": {
            "en": {
                "transcript": [
                    "Caller: Hello, this is SkyRoute travel confirming your itinerary update.",
                    "Caller: Your flight time changed by 25 minutes; details are in your app and email.",
                    "Caller: No extra charge is needed on this call.",
                ],
                "red_flags": [],
                "safe_action": "Check your booking app or airline portal to verify the update.",
                "teaching_summary": "Legitimate travel calls point to existing bookings and documented channels.",
            },
            "hi": {
                "transcript": [
                    "Caller: SkyRoute travel se itinerary update confirm kar rahe hain.",
                    "Caller: Flight time 25 minute change hua hai; details app aur email me hain.",
                    "Caller: Is call par koi extra charge nahi hai.",
                ],
                "red_flags": [],
                "safe_action": "Booking app ya airline portal me details verify karein.",
                "teaching_summary": "Normal travel update documented channels me available hota hai.",
            },
            "es": {
                "transcript": [
                    "Llamador: SkyRoute travel confirma actualizacion de su itinerario.",
                    "Llamador: Su vuelo cambio 25 minutos; detalles en app y correo.",
                    "Llamador: No se requiere cargo adicional en esta llamada.",
                ],
                "red_flags": [],
                "safe_action": "Verifique en la app de reserva o portal de la aerolinea.",
                "teaching_summary": "Actualizaciones de viaje legitimas apuntan a reservas existentes.",
            },
        },
    },
    {
        "scenario_id": "refund_update_safe_019",
        "title": "Normal Shopping Refund Update",
        "scam_type": "Legitimate merchant update",
        "difficulty": "medium",
        "label": "safe",
        "language_versions": {
            "en": {
                "transcript": [
                    "Caller: This is GreenCart support with an update on your refund request.",
                    "Caller: The refund is approved and will appear in 3 to 5 business days.",
                    "Caller: We do not need card numbers or OTP on this call.",
                ],
                "red_flags": [],
                "safe_action": "Review the merchant app/email confirmation and monitor your statement.",
                "teaching_summary": "Legitimate refund calls do not request OTP, remote access, or urgent payments.",
            },
            "hi": {
                "transcript": [
                    "Caller: GreenCart support se aapke refund request ka update hai.",
                    "Caller: Refund approve ho gaya hai aur 3-5 business days me reflect hoga.",
                    "Caller: Is call par card number ya OTP ki zarurat nahi hai.",
                ],
                "red_flags": [],
                "safe_action": "Merchant app/email confirmation check karein aur statement monitor karein.",
                "teaching_summary": "Real refund call OTP ya urgent payment nahi mangti.",
            },
            "es": {
                "transcript": [
                    "Llamador: GreenCart soporte con actualizacion de su reembolso.",
                    "Llamador: El reembolso fue aprobado y aparecera en 3 a 5 dias habiles.",
                    "Llamador: No necesitamos numero de tarjeta ni OTP en esta llamada.",
                ],
                "red_flags": [],
                "safe_action": "Revise confirmacion en app/correo y su estado de cuenta.",
                "teaching_summary": "Un reembolso legitimo no pide OTP ni pagos urgentes.",
            },
        },
    },
    {
        "scenario_id": "bank_fraud_safe_020",
        "title": "Normal Bank Fraud Alert With Official Callback",
        "scam_type": "Legitimate bank fraud alert",
        "difficulty": "hard",
        "label": "safe",
        "language_versions": {
            "en": {
                "transcript": [
                    "Caller: This is your bank's fraud monitoring team regarding unusual card activity.",
                    "Caller: For security, we will not ask for your OTP or password on this call.",
                    "Caller: Please hang up and call the official number on your card to review transactions.",
                ],
                "red_flags": [],
                "safe_action": "Call the official number printed on your card before taking action.",
                "teaching_summary": "Some real fraud alerts mention risk but still avoid secrecy, OTP requests, and payment pressure.",
            },
            "hi": {
                "transcript": [
                    "Caller: Aapke bank fraud monitoring team se unusual card activity ke baare me call hai.",
                    "Caller: Security ke liye hum is call par OTP ya password nahi puchte.",
                    "Caller: Kripya call kaat kar card par diya official number dial karein.",
                ],
                "red_flags": [],
                "safe_action": "Kisi bhi action se pehle card par printed official number par call karein.",
                "teaching_summary": "Real fraud alert urgency mention kar sakta hai, lekin OTP ya payment demand nahi karta.",
            },
            "es": {
                "transcript": [
                    "Llamador: Equipo de monitoreo antifraude de su banco por actividad inusual.",
                    "Llamador: Por seguridad, no pedimos OTP ni contrasena en esta llamada.",
                    "Llamador: Cuelgue y llame al numero oficial de su tarjeta para revisar movimientos.",
                ],
                "red_flags": [],
                "safe_action": "Llame al numero oficial impreso en su tarjeta antes de actuar.",
                "teaching_summary": "Una alerta real puede mencionar riesgo sin pedir OTP, secreto ni pagos urgentes.",
            },
        },
    },
]


SEEDED_SCENARIOS = SCENARIOS
SUPPORTED_LANGUAGES = ("en", "hi", "es")


def _normalize_supported_languages(scenario: dict[str, Any]) -> list[str]:
    declared = scenario.get("supported_languages")
    if isinstance(declared, list) and declared:
        return [str(item) for item in declared if str(item).strip()]
    versions = scenario.get("language_versions", {})
    if isinstance(versions, dict) and versions:
        return [str(language) for language in versions.keys()]
    return ["en"]


def _load_all_scenarios() -> list[dict[str, Any]]:
    seeded = list(SEEDED_SCENARIOS)
    logger.info("ACADEMY_SEEDED_SCENARIOS_LOADED count=%d", len(seeded))

    imported: list[dict[str, Any]] = []
    if settings.ACADEMY_USE_HF_DATASET:
        importer = AcademyDatasetImporter(
            dataset_name=settings.ACADEMY_HF_DATASET_NAME,
            max_scenarios=settings.ACADEMY_MAX_DATASET_SCENARIOS,
            cache_dir=settings.ACADEMY_DATASET_CACHE_DIR,
        )
        imported = importer.load_scenarios()

    deduped = list(seeded)
    existing_ids = {scenario["scenario_id"] for scenario in deduped}
    imported_added = 0
    for scenario in imported:
        scenario_id = scenario.get("scenario_id")
        if not scenario_id or scenario_id in existing_ids:
            continue
        deduped.append(scenario)
        existing_ids.add(scenario_id)
        imported_added += 1

    logger.info("ACADEMY_IMPORTED_SCENARIOS_LOADED count=%d", imported_added)
    logger.info("ACADEMY_TOTAL_SCENARIOS_READY count=%d", len(deduped))
    return deduped


ALL_SCENARIOS = _load_all_scenarios()
SCENARIOS_BY_ID = {scenario["scenario_id"]: scenario for scenario in ALL_SCENARIOS}


def list_scenario_summaries() -> list[dict[str, Any]]:
    summaries: list[dict[str, Any]] = []
    for scenario in ALL_SCENARIOS:
        supported_languages = _normalize_supported_languages(scenario)
        summaries.append(
            {
                "scenario_id": scenario["scenario_id"],
                "title": scenario["title"],
                "scam_type": scenario["scam_type"],
                "difficulty": scenario["difficulty"],
                "label": scenario["label"],
                "supported_languages": supported_languages,
            }
        )
    return summaries


def get_scenario_for_language(scenario_id: str, language: str) -> dict[str, Any] | None:
    scenario = SCENARIOS_BY_ID.get(scenario_id)
    if scenario is None:
        return None

    supported_languages = _normalize_supported_languages(scenario)
    requested_language = (language or "en").strip().lower()
    selected_language = requested_language
    language_fallback = False

    language_versions = scenario["language_versions"]
    if selected_language not in language_versions:
        selected_language = "en" if "en" in language_versions else supported_languages[0]
        language_fallback = selected_language != requested_language
        if language_fallback:
            logger.info(
                "ACADEMY_LANGUAGE_FALLBACK scenario_id=%s requested=%s fallback=%s",
                scenario_id,
                requested_language,
                selected_language,
            )

    version = language_versions[selected_language]
    payload = {
        "scenario_id": scenario["scenario_id"],
        "title": scenario["title"],
        "scam_type": scenario["scam_type"],
        "difficulty": scenario["difficulty"],
        "label": scenario["label"],
        "language": selected_language,
        "supported_languages": supported_languages,
        "transcript": version["transcript"],
        "red_flags": version["red_flags"],
        "safe_action": version["safe_action"],
        "teaching_summary": version["teaching_summary"],
    }
    if language_fallback:
        payload["language_fallback"] = True
    return payload
