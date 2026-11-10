// Catálogo de misiones fuera de la pantalla.
// slot: manana | mediodia | tarde | noche | cualquiera

export const CATEGORIES = {
  cuerpo: { label: 'Cuerpo', hint: 'Moverte un poco', interests: ['caminar', 'deporte'] },
  mente: { label: 'Mente', hint: 'Leer, aprender, pensar', interests: ['leer'] },
  manos: { label: 'Manos', hint: 'Crear con las manos', interests: ['cocinar', 'dibujar', 'musica', 'plantas'] },
  gente: { label: 'Gente', hint: 'Estar con alguien', interests: ['gente'] },
  calma: { label: 'Calma', hint: 'Parar y respirar', interests: [] },
};

const m = (id, category, title, minutes, slot, note) => ({ id, category, title, minutes, slot, note });

export const MISSIONS = [
  // CUERPO
  m('c01', 'cuerpo', 'Sal a caminar 15 minutos', 15, 'cualquiera', 'Sin rumbo. Sin podcast, si te atreves.'),
  m('c02', 'cuerpo', 'Estira el cuerpo 10 minutos', 10, 'manana', 'Cuello, hombros, espalda. Despacio.'),
  m('c03', 'cuerpo', 'Sube y baja escaleras 5 minutos', 5, 'mediodia', 'Las de tu casa o las del trabajo.'),
  m('c04', 'cuerpo', 'Da una vuelta a la manzana', 10, 'tarde', 'Fíjate en una cosa que nunca habías visto.'),
  m('c05', 'cuerpo', 'Baila tres canciones', 12, 'tarde', 'Nadie mira. Y si mira, mejor.'),
  m('c06', 'cuerpo', 'Paseo largo de 30 minutos', 30, 'cualquiera', 'El móvil en el bolsillo, en silencio.'),
  m('c07', 'cuerpo', 'Haz 15 minutos de yoga suave', 15, 'manana', 'O lo que tu cuerpo entienda por yoga.'),
  m('c08', 'cuerpo', 'Camina hasta una tienda en vez de pedir', 20, 'mediodia', 'Compra algo pequeño a pie.'),
  m('c09', 'cuerpo', 'Sal a correr o trotar 20 minutos', 20, 'manana', 'A tu ritmo. Contar no hace falta.'),
  m('c10', 'cuerpo', 'Ordena y limpia una habitación', 20, 'tarde', 'Moverse también es esto.'),
  m('c11', 'cuerpo', 'Paseo nocturno de 15 minutos', 15, 'noche', 'Mira cuántas ventanas siguen encendidas.'),
  m('c12', 'cuerpo', 'Juega con una pelota 10 minutos', 10, 'cualquiera', 'Contra una pared vale.'),
  // MENTE
  m('m01', 'mente', 'Lee 10 páginas de un libro de papel', 15, 'cualquiera', 'Si te duermes, también cuenta.'),
  m('m02', 'mente', 'Escribe una página a mano', 15, 'noche', 'Lo que pase por la cabeza. Sin corregir.'),
  m('m03', 'mente', 'Haz un crucigrama o sudoku en papel', 15, 'mediodia', 'Con lápiz, para poder borrar.'),
  m('m04', 'mente', 'Lee un capítulo entero', 25, 'noche', 'Hasta el final del capítulo, ni una página menos.'),
  m('m05', 'mente', 'Aprende 10 palabras de otro idioma', 10, 'manana', 'En un papel, no en una app.'),
  m('m06', 'mente', 'Planifica tu semana en una libreta', 10, 'manana', 'Tres cosas importantes. Nada más.'),
  m('m07', 'mente', 'Lee una revista o periódico en papel', 15, 'mediodia', 'Las páginas que pasan con los dedos.'),
  m('m08', 'mente', 'Escribe una carta a alguien', 20, 'tarde', 'No hace falta enviarla.'),
  m('m09', 'mente', 'Resuelve un puzle o rompecabezas', 20, 'tarde', 'Aunque sean solo los bordes.'),
  m('m10', 'mente', 'Repasa tus notas o apuntes a mano', 15, 'cualquiera', 'Subraya lo que todavía te importa.'),
  m('m11', 'mente', 'Haz una lista de 10 cosas que te gustan', 5, 'cualquiera', 'Pequeñas valen más.'),
  m('m12', 'mente', 'Lee poesía 10 minutos', 10, 'noche', 'En voz baja, si te apetece.'),
  // MANOS
  m('h01', 'manos', 'Cocina algo desde cero', 30, 'tarde', 'Una tortilla también es desde cero.'),
  m('h02', 'manos', 'Dibuja lo que tengas delante', 15, 'cualquiera', 'No tiene que parecerse.'),
  m('h03', 'manos', 'Toca un instrumento 20 minutos', 20, 'tarde', 'Desafinar es parte del trato.'),
  m('h04', 'manos', 'Cuida tus plantas', 10, 'manana', 'Riega, limpia hojas, cambia de sitio.'),
  m('h05', 'manos', 'Arregla algo que lleve tiempo roto', 20, 'cualquiera', 'Un botón, una bisagra, un cajón.'),
  m('h06', 'manos', 'Prepara un desayuno con calma', 15, 'manana', 'Sentado. Sin pantalla delante.'),
  m('h07', 'manos', 'Haz una figura de papel u origami', 15, 'mediodia', 'Una grulla torcida es una grulla.'),
  m('h08', 'manos', 'Teje, cose o borda un rato', 25, 'noche', 'Dos vueltas bastan.'),
  m('h09', 'manos', 'Amasa pan o masa de pizza', 30, 'tarde', 'Amasar calma más de lo que parece.'),
  m('h10', 'manos', 'Pinta con acuarelas o lápices', 20, 'cualquiera', 'Manchas de color, sin plan.'),
  m('h11', 'manos', 'Ordena un cajón a mano', 10, 'mediodia', 'Solo uno.'),
  m('h12', 'manos', 'Escribe una receta en una tarjeta', 10, 'noche', 'Para alguien que todavía no la sabe.'),
  // GENTE
  m('g01', 'gente', 'Llama a alguien por voz', 10, 'cualquiera', 'Llamar, no escribir. Ya sabes.'),
  m('g02', 'gente', 'Queda con alguien para un café', 30, 'tarde', 'El móvil boca abajo en la mesa.'),
  m('g03', 'gente', 'Come con alguien sin pantallas', 30, 'mediodia', 'La sobremesa también vale.'),
  m('g04', 'gente', 'Pasea con alguien 20 minutos', 20, 'tarde', 'Caminar al lado facilita hablar.'),
  m('g05', 'gente', 'Juega a un juego de mesa', 30, 'noche', 'Si pierdes, también ganas.'),
  m('g06', 'gente', 'Saluda a un vecino y charla un poco', 5, 'cualquiera', 'Dos frases ya cuentan.'),
  m('g07', 'gente', 'Llama a alguien mayor de tu familia', 15, 'cualquiera', 'Pregúntale por algo de antes.'),
  m('g08', 'gente', 'Cocina para otra persona', 30, 'noche', 'Y comed juntos.'),
  m('g09', 'gente', 'Escribe una nota a mano y déjala', 5, 'manana', 'En la nevera, en una mesa, en un buzón.'),
  m('g10', 'gente', 'Ayuda a alguien con una tarea', 20, 'cualquiera', 'Sin que te lo pida, mejor.'),
  m('g11', 'gente', 'Haz una videollamada sin hacer otra cosa', 15, 'noche', 'Solo esa ventana abierta.'),
  m('g12', 'gente', 'Pregunta a alguien cómo está de verdad', 10, 'mediodia', 'Y escucha la respuesta entera.'),
  // CALMA
  m('k01', 'calma', 'Mira por la ventana 5 minutos', 5, 'cualquiera', 'Sin hacer nada. Es más difícil de lo que parece.'),
  m('k02', 'calma', 'Respira despacio 5 minutos', 5, 'cualquiera', 'Cuatro dentro, seis fuera.'),
  m('k03', 'calma', 'Siéntate fuera 10 minutos', 10, 'mediodia', 'Un banco, un balcón, un escalón.'),
  m('k04', 'calma', 'Escucha un disco entero sin hacer nada', 30, 'noche', 'Tumbado, si puede ser.'),
  m('k05', 'calma', 'Toma un té o café sin pantalla', 10, 'manana', 'Mira el vapor un rato.'),
  m('k06', 'calma', 'Medita 10 minutos', 10, 'manana', 'Cuando te distraigas, vuelve. Eso es todo.'),
  m('k07', 'calma', 'Mira el cielo al anochecer', 10, 'tarde', 'Cuenta cuántos colores tiene.'),
  m('k08', 'calma', 'Date una ducha o baño largo', 20, 'noche', 'Sin el móvil en el baño.'),
  m('k09', 'calma', 'Túmbate y escucha los sonidos', 5, 'cualquiera', 'Nombra tres que no habías oído.'),
  m('k10', 'calma', 'Pasea despacio sin destino', 15, 'tarde', 'Más lento que de costumbre.'),
  m('k11', 'calma', 'Prepárate para dormir sin pantallas', 20, 'noche', 'Luz baja, móvil fuera del cuarto.'),
  m('k12', 'calma', 'Observa una planta o árbol 5 minutos', 5, 'cualquiera', 'Cómo se mueve con el aire.'),
];

export const MICRO_MISSIONS = [
  m('x01', 'cuerpo', 'Levántate y estira los brazos', 2, 'cualquiera', 'Hacia arriba, todo lo que puedas.'),
  m('x02', 'calma', 'Bebe un vaso de agua despacio', 2, 'cualquiera', 'Sorbo a sorbo.'),
  m('x03', 'calma', 'Mira lejos por la ventana', 3, 'cualquiera', 'Lo más lejos que alcances.'),
  m('x04', 'manos', 'Ordena tu mesa', 3, 'cualquiera', 'Solo lo que está a la vista.'),
  m('x05', 'cuerpo', 'Da una vuelta por casa', 3, 'cualquiera', 'Abre una ventana de paso.'),
  m('x06', 'mente', 'Escribe tres cosas en un papel', 3, 'cualquiera', 'Lo que tengas en la cabeza.'),
  m('x07', 'manos', 'Riega una planta', 2, 'cualquiera', 'O mírala y decide si lo necesita.'),
  m('x08', 'calma', 'Cierra los ojos y cuenta 30 respiraciones', 4, 'cualquiera', 'Si te pierdes, empieza otra vez.'),
  m('x09', 'gente', 'Di algo amable a alguien cerca', 2, 'cualquiera', 'En persona.'),
  m('x10', 'cuerpo', 'Haz 10 sentadillas lentas', 2, 'cualquiera', 'Lentas de verdad.'),
  m('x11', 'mente', 'Lee una página de cualquier libro', 3, 'cualquiera', 'Abre por donde caiga.'),
  m('x12', 'manos', 'Dibuja un garabato con los ojos cerrados', 3, 'cualquiera', 'Luego ábrelos y ríete un poco.'),
];

export const ALL_MISSIONS = [...MISSIONS, ...MICRO_MISSIONS];
export const missionById = (id) => ALL_MISSIONS.find((x) => x.id === id);
