# Offgrid

Una app diseñada para que la cierres. Propone misiones fuera de la pantalla
(caminar, leer, crear con las manos, ver a alguien, parar) y convierte el tiempo
que pasas lejos del móvil en luz para un planeta 3D que construyes a tu gusto.

## Principios

- Cero culpa: si pasan días sin misiones, el planeta entra en penumbra. Nunca se pierde nada.
- Sesiones de menos de un minuto: entrar, aceptar, salir.
- Sin rachas que castigan, sin cofres, sin cuentas atrás, sin anuncios.
- Todo se guarda en el dispositivo (localStorage). Sin cuentas ni servidor.

## Qué incluye

- **Onboarding** de 5 pasos: apps que enganchan, momentos del día, intereses, mundo inicial y permisos explicados con honestidad.
- **60 misiones** (12 por categoría: Cuerpo, Mente, Manos, Gente, Calma) y 12 micro-misiones. Se proponen según la franja horaria, tus intereses y lo que hiciste hace poco. Cambiar (máx. 2 al día) o dejar para luego.
- **Misión en curso** con temporizador real y anillo de progreso; al volver, se cierra sola. Pregunta opcional de cómo te sentiste.
- **Planeta 3D realista** (Three.js, procedural): continentes, cordilleras, costas, mares, nubes, atmósfera y casquetes polares. Empieza como roca a oscuras y se recupera por etapas con el tiempo fuera (Roca despierta → Mares → Aire → Vida → Mundo pleno).
- **Modo construcción**: compras en la tienda y colocas cada pieza donde quieras, con vista previa. Árboles y estructuras solo en tierra; animales solo en el agua. Girar, mover, recoger o repartir al azar.
- **Tienda** con luz ganada en misiones: pieles de planeta, mejoras (anillos, aurora, cielo profundo, amanecer largo), naturaleza, estructuras (incluida La cima) y animales marinos. Vista previa 3D de cada cosa.
- **Gestas** que no se compran: Raíces largas (7 días seguidos), Faro de voces (3 misiones de Gente), Cumbre de la semana (cumplir la meta).
- **Semana** de lunes a domingo: resumen narrativo, meta semanal (1 h / 2 h / 4 h) con bonus que se recoge una vez, y clima del mundo (niebla, lluvia, despejado, aurora).
- **Modo antojo**: respirar 1 minuto, micro-misión o esperar 10 minutos con el planeta de fondo.
- **Ajustes**: tema claro/oscuro, texto grande, contraste alto, reducir movimiento (respeta el del sistema), modo prueba (misiones de 5 s), exportar/importar copia.

## Instalarla en el móvil

La web se publica en GitHub Pages con `.github/workflows/pages.yml` cada vez que
hay cambios en `main`. Una vez abierta en el navegador del móvil se puede añadir
a la pantalla de inicio (Android: «Instalar app»; iPhone: Compartir → «Añadir a
pantalla de inicio»). Funciona sin conexión gracias a `public/sw.js`.

Para activarlo la primera vez: en GitHub, *Settings → Pages → Source: GitHub Actions*.

## Desarrollo

```bash
npm install
npm run dev      # servidor local
npm run build    # compilación en dist/
```

La versión web no puede leer el tiempo de uso real del sistema; cuenta el tiempo de las
misiones hechas con el temporizador. La arquitectura queda preparada para una versión
nativa con Screen Time / UsageStatsManager.
