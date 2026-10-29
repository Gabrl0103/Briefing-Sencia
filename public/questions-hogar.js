// Preguntas del briefing de hogar. Las usan el formulario (navegador) y el panel/correo/PDF (servidor).
const S = [
 {t:"Datos de contacto", n:"Para saber con quién hablamos.", q:[
  {id:"nombre",l:"Nombre completo",type:"text",req:1},
  {id:"tel",l:"Celular / WhatsApp",type:"tel",req:1},
  {id:"correo",l:"Correo electrónico",type:"email"},
  {id:"ciudad",l:"Ciudad",type:"text"}]},
 {t:"Quiénes viven aquí", n:"El hogar se diseña alrededor de las personas.", q:[
  {id:"habitantes",l:"¿Quiénes van a vivir en la casa?",type:"area",h:"Cuántas personas, edades y a qué se dedica cada una."},
  {id:"mascotas",l:"¿Tienen mascotas?",type:"area",h:"Cuáles, de qué tamaño y si duermen adentro."},
  {id:"cambios",l:"¿Esperan cambios en los próximos años?",type:"area",h:"Bebés, hijos que se van, padres que llegan a vivir, trabajo desde casa."},
  {id:"adaptaciones",l:"¿Alguien necesita adaptaciones especiales?",type:"area",h:"Por ejemplo, evitar escaleras o barras de apoyo en el baño."}]},
 {t:"Rutinas", n:"Cómo se vive la casa un día cualquiera.", q:[
  {id:"dia",l:"Cuéntanos un día normal en casa, de la mañana a la noche",type:"area"},
  {id:"trabajo",l:"¿Alguien trabaja o estudia desde casa?",type:"one",o:["Sí, todos los días","Algunos días","No"]},
  {id:"cocina",l:"¿Cómo usan la cocina?",type:"one",o:["Cocinamos todos los días","Solo lo básico","Nos encanta cocinar y recibir","Casi no cocinamos"]},
  {id:"visitas",l:"¿Reciben visitas con frecuencia?",type:"one",o:["Muy seguido","A veces","Casi nunca"]},
  {id:"pasatiempos",l:"Pasatiempos que necesitan espacio",type:"area",h:"Bicicletas, instrumentos, ejercicio, lectura, plantas, colecciones."}]},
 {t:"La vivienda", n:"Lo que existe hoy y sus condiciones.", q:[
  {id:"barrio",l:"Barrio o conjunto",type:"text"},
  {id:"tipo",l:"Tipo de vivienda",type:"one",o:["Casa","Apartamento","Casa campestre","Otro"]},
  {id:"tenencia",l:"La vivienda es…",type:"one",o:["Propia","Arrendada","En compra / sobre planos"]},
  {id:"estado",l:"Estado actual",type:"one",o:["Obra gris","Nueva, recién entregada","Habitada, para remodelar","No lo sé"]},
  {id:"area",l:"Área aproximada (m²) y número de pisos",type:"text"},
  {id:"planos",l:"¿Tienes planos, medidas o fotos?",type:"one",o:["Sí, planos","Solo fotos o medidas","No tengo nada aún"]}]},
 {t:"Los espacios", n:"Dónde vamos a intervenir y qué hay que resolver.", q:[
  {id:"espacios",l:"Espacios que quieres diseñar",type:"multi",o:["Sala","Comedor","Cocina","Alcoba principal","Alcobas de hijos","Alcoba de huéspedes","Baños","Estudio u oficina","Zona de ropas","Terraza o balcón","Jardín","Fachada","Toda la casa"]},
  {id:"conservar",l:"¿Qué te gusta de tu casa actual y quieres conservar?",type:"area"},
  {id:"molesta",l:"¿Qué te molesta o no funciona hoy?",type:"area",h:"Falta de luz, poco almacenamiento, espacios que no se usan, ruido."},
  {id:"guardar",l:"¿Qué necesitas guardar?",type:"area",h:"Ropa, zapatos, ollas, herramientas, documentos, juguetes."},
  {id:"muebles",l:"Muebles u objetos que deben quedarse",type:"area",h:"Piezas familiares, arte, muebles que te gustan."}]},
 {t:"Estilo y sensaciones", n:"Tu casa debe sentirse tuya.", q:[
  {id:"palabras",l:"Tres palabras para cómo quieres sentirte al llegar a casa",type:"text",h:"Por ejemplo: en calma, abrigada, inspirada."},
  {id:"estilo",l:"Estilos con los que te identificas",type:"multi",o:["Minimalista","Contemporáneo cálido","Nórdico","Japandi","Industrial","Rústico moderno","Boho","Clásico elegante","Ecléctico","Aún no sé"]},
  {id:"materiales",l:"Materiales que te gustan",type:"multi",o:["Madera","Piedra","Microcemento","Mármol","Ladrillo a la vista","Metal negro","Fibras naturales","Lino y algodón","Cerámica artesanal"]},
  {id:"colores",l:"Colores que te gustan y colores que no quieres",type:"area"},
  {id:"refs",l:"Referencias visuales",type:"area",h:"Pega links de Pinterest, Instagram o fotos que te inspiren."}]},
 {t:"Confort", n:"Lo que no se ve en una foto, pero se siente todos los días.", q:[
  {id:"frio",l:"¿Cómo se siente la casa con el frío?",type:"one",o:["Es fría, nos cuesta calentarla","Es templada","No tenemos problema"]},
  {id:"calefaccion",l:"¿Te interesa calefacción, chimenea o calentadores?",type:"one",o:["Sí","Tal vez","No"]},
  {id:"iluminacion",l:"¿Cómo quieres la iluminación?",type:"one",o:["Cálida y acogedora","Clara y luminosa","Que cambie según el momento","Que la defina el estudio"]},
  {id:"ruido",l:"¿Hay problemas de ruido o de privacidad?",type:"area"},
  {id:"plantas",l:"¿Quieres plantas dentro de la casa?",type:"one",o:["Muchas","Algunas","Ninguna"]}]},
 {t:"Alcance, tiempos e inversión", n:"Para preparar una propuesta realista.", q:[
  {id:"servicios",l:"¿Qué necesitas de Sencia Estudio?",type:"multi",o:["Distribución arquitectónica","Diseño interior completo","Renders 3D","Mobiliario a medida","Selección de acabados","Diseño de iluminación","Decoración y styling","Acompañamiento de obra"]},
  {id:"presupuesto",l:"Inversión aproximada para obra y mobiliario (COP)",type:"one",o:["Menos de 30 millones","30 a 80 millones","80 a 150 millones","Más de 150 millones","Aún no lo tengo definido"]},
  {id:"fecha",l:"¿Para cuándo quieres tener la casa lista?",type:"text"},
  {id:"durante_obra",l:"¿Vivirán en la casa durante la obra?",type:"one",o:["Sí","No","No sé"]},
  {id:"decide",l:"¿Quiénes toman las decisiones del proyecto?",type:"text",h:"Para incluirlos en las reuniones de presentación."}]},
 {t:"Para cerrar", n:"", q:[
  {id:"rincon",l:"Si pudieras tener un solo rincón soñado en tu casa, ¿cómo sería?",type:"area"},
  {id:"extra",l:"¿Algo más que debamos saber?",type:"area"}]}
];
if (typeof module !== "undefined") module.exports = S;
