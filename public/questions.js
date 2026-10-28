// Preguntas del briefing. Las usan el formulario (navegador) y el admin (servidor).
const S = [
 {t:"Datos de contacto", n:"Para saber con quién hablamos.", q:[
  {id:"nombre",l:"Nombre completo",type:"text",req:1},
  {id:"marca",l:"Nombre del negocio o marca",type:"text",req:1},
  {id:"cargo",l:"Tu rol en el negocio",type:"text",h:"Dueño, socio, administrador…"},
  {id:"tel",l:"Celular / WhatsApp",type:"tel",req:1},
  {id:"correo",l:"Correo electrónico",type:"email"},
  {id:"ciudad",l:"Ciudad",type:"text"}]},
 {t:"Tu negocio", n:"El diseño parte de entender qué vendes y a quién.", q:[
  {id:"tipo",l:"Tipo de negocio",type:"multi",o:["Restaurante","Café o heladería","Bar o rooftop","Tienda / retail","Oficina","Coworking","Consultorio / salud","Hotel u hospedaje","Belleza / spa","Otro"]},
  {id:"producto",l:"¿Qué vendes u ofreces?",type:"area",h:"Productos o servicios principales, y el que más te deja."},
  {id:"etapa",l:"¿En qué etapa está el negocio?",type:"one",o:["Es nuevo, aún no abre","Ya funciona y vamos a remodelar","Abriremos una nueva sede"]},
  {id:"diferencial",l:"¿Qué te hace diferente de la competencia?",type:"area"},
  {id:"cliente",l:"¿Quién es tu cliente ideal?",type:"area",h:"Edad, estilo de vida, cuánto tiempo se queda, con quién llega."},
  {id:"referentes",l:"Negocios que admiras o que son tu competencia directa",type:"area",h:"Locales de aquí o de otras ciudades."}]},
 {t:"El espacio", n:"Lo que existe hoy y sus condiciones.", q:[
  {id:"ubicacion",l:"Dirección o ubicación del local",type:"text",h:"Barrio, centro comercial, calle principal…"},
  {id:"area",l:"Área aproximada (m²) y número de niveles",type:"text"},
  {id:"estado",l:"Estado actual del espacio",type:"one",o:["Obra gris","Local vacío con acabados","Negocio funcionando","No lo sé"]},
  {id:"tenencia",l:"El local es…",type:"one",o:["Propio","Arrendado"]},
  {id:"restricciones",l:"Restricciones que debamos conocer",type:"area",h:"Reglas del arrendador o del centro comercial, cosas que no se pueden tocar, permisos."},
  {id:"planos",l:"¿Tienes planos, medidas o fotos del espacio?",type:"one",o:["Sí, planos","Solo fotos o medidas","No tengo nada aún"]}]},
 {t:"Operación", n:"Cómo funciona el día a día dentro del espacio.", q:[
  {id:"horario",l:"Horario de atención y horas de más movimiento",type:"text"},
  {id:"equipo",l:"¿Cuántas personas trabajan por turno?",type:"text"},
  {id:"capacidad",l:"Capacidad que necesitas",type:"text",h:"Mesas, puestos de trabajo, clientes al tiempo, consultorios…"},
  {id:"zonas",l:"Zonas que debe tener el espacio",type:"multi",o:["Caja / recepción","Exhibición de producto","Vitrina o escaparate","Zona de espera","Mesas o barra","Cocina o preparación","Bodega","Baños para clientes","Área de empleados","Oficina administrativa","Sala de reuniones","Terraza o exterior"]},
  {id:"equipos",l:"Equipos o mobiliario que ya tienes y quieres conservar",type:"area",h:"Neveras, vitrinas, máquinas, mobiliario existente."},
  {id:"recorrido",l:"¿Cómo imaginas el recorrido del cliente desde que entra hasta que sale?",type:"area"}]},
 {t:"Marca y sensaciones", n:"El espacio debe sentirse como tu marca.", q:[
  {id:"identidad",l:"¿Tienes identidad visual?",type:"one",o:["Sí, logo y manual de marca","Solo logo","Está en proceso","No"]},
  {id:"colores",l:"Colores de tu marca o colores que te gustan",type:"text"},
  {id:"palabras",l:"Tres palabras para lo que debe sentir tu cliente al entrar",type:"text",h:"Por ejemplo: acogido, sorprendido, tranquilo."},
  {id:"estilo",l:"Estilos con los que te identificas",type:"multi",o:["Minimalista","Contemporáneo cálido","Industrial","Natural / orgánico","Nórdico","Tropical","Clásico elegante","Ecléctico","Aún no sé"]},
  {id:"noquiero",l:"Lo que definitivamente NO quieres",type:"area",h:"Colores, materiales o estilos que no te gustan."},
  {id:"refs",l:"Referencias visuales",type:"area",h:"Pega links de Pinterest, Instagram o fotos que te inspiren."}]},
 {t:"Fachada y visibilidad", n:"Lo que la gente ve antes de entrar.", q:[
  {id:"fachada",l:"¿El proyecto incluye fachada o aviso?",type:"one",o:["Sí","No","No sé"]},
  {id:"visibilidad",l:"¿Cómo llega tu cliente al local?",type:"area",h:"Pasa caminando, en carro, te busca en redes, dentro de un centro comercial…"},
  {id:"iluminacion",l:"¿Cómo imaginas la iluminación?",type:"one",o:["Cálida y tenue","Clara y luminosa","Que cambie según la hora","Que lo defina el estudio"]}]},
 {t:"Alcance, tiempos e inversión", n:"Para preparar una propuesta realista.", q:[
  {id:"servicios",l:"¿Qué necesitas de Sencia Estudio?",type:"multi",o:["Distribución del espacio","Diseño interior completo","Diseño de fachada","Renders 3D","Mobiliario a medida","Diseño de iluminación","Visual merchandising","Escaparatismo","Acompañamiento de obra"]},
  {id:"presupuesto",l:"Inversión aproximada para la obra y el mobiliario (COP)",type:"one",o:["Menos de 20 millones","20 a 50 millones","50 a 100 millones","Más de 100 millones","Aún no lo tengo definido"]},
  {id:"fecha",l:"¿Para cuándo quieres abrir o terminar?",type:"text"},
  {id:"decide",l:"¿Quiénes toman las decisiones del proyecto?",type:"text",h:"Para incluirlos en las reuniones de presentación."}]},
 {t:"Para cerrar", n:"", q:[
  {id:"exito",l:"Dentro de un año, ¿cómo sabrías que el diseño funcionó?",type:"area",h:"Más ventas, más tiempo de permanencia, fotos en redes, otra cosa."},
  {id:"extra",l:"¿Algo más que debamos saber?",type:"area"}]}
];
if (typeof module !== "undefined") module.exports = S;
