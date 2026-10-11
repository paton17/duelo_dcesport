# DC DUEL LEAGUE V3 — Torneo Free Fire profesional

Sitio completo con página pública, panel del jefe, administradores auxiliares, cuentas de equipos, logos, música, tablas automáticas y duelos 4vs4 o 6vs6. Funciona con **PGlite en Windows para pruebas locales** y **PostgreSQL en Railway** para publicación.

## Funciones

| Panel | Funciones |
|---|---|
| Visitantes | Portada, clasificación, calendario por jornadas, alineaciones elegidas, kills, perfil de equipos y jugadores |
| Jefe | Personalización visual, logo del sitio, fondo, música, gestión ilimitada de equipos, credenciales, creación de admins, jornadas, alineaciones, marcadores y kills |
| Administrador auxiliar | Generar cruces, seleccionar alineaciones en cada partido, registrar y modificar marcadores y kills; no puede cambiar la cuenta del jefe ni crear equipos |
| Capitán de equipo | Editar logo, nombres y fotos, gestionar 6 titulares base y suplentes sin límite de plazas predefinidas |

**Puntos:** victoria +3; derrota +0. Clasificación por puntos, diferencia de rondas, rondas a favor y kills. Los empates de resultados están bloqueados.

**Jornadas:** seleccionar 1 = ida, 2 = ida/vuelta. En la vuelta se invierte quién juega de local. Con `n` equipos, una vuelta tiene `n × (n−1)/2` encuentros; ida/vuelta tienen `n × (n−1)` encuentros. Pulsar nuevamente Generar calendario no duplica partidos de esa misma jornada.

**Equipos:** ingresar `0` en *Cantidad máxima de equipos* significa sin límite predefinido. También puedes fijar un número personalizado, como 8, 12 o 36.

**Plantillas:** cada equipo se crea con seis jugadores base. Se pueden agregar tantos suplentes como se requieran y editar las fotos y los nicks `DC.`. En el acta de cada duelo, el jefe o administrador selecciona **4 o 6 jugadores** de cada equipo (dependiendo de la modalidad) y los suplentes no alineados no reciben partidas ni kills. Una alineación puede guardarse antes del resultado y se publica para visitantes. Las kills se atribuyen solo a quienes jugaron.

## Instalar en Windows con VS Code

1. Instala [Node.js LTS](https://nodejs.org/).
2. Abre `DC_DUELO_PRO` en VS Code.
3. Copia `.env.example` con el nombre **`.env`** (en el mismo nivel que `server.js`).
4. Cambia `OWNER_USERNAME=Caleb` y define en `OWNER_PASSWORD` la contraseña real y privada del jefe. También define un `SESSION_SECRET` largo y aleatorio (al menos 32 caracteres).
5. En la terminal de VS Code ejecuta:

   ```powershell
   npm.cmd install
   npm.cmd start
   ```

6. Abre `http://localhost:3000`.
7. Pulsa **ACCEDER**, inicia sesión como jefe y abre **Panel del jefe**.

### Si estás actualizando desde la V2

**Detén el servidor (Ctrl + C), crea una copia de seguridad de la carpeta y usa el ZIP de actualización.** Conserva `.env` y `.local-data`: contienen las claves y tu base local. No copies una `.env.example` sobre tu `.env` existente.

Los cambios en el esquema se realizan al iniciar V3. **No es necesario borrar tus equipos ni tus resultados.** Los jugadores de partidas anteriores se migran a las alineaciones a partir de sus kills históricas.

Para cambiar el usuario y contraseña del jefe ya existente en la base local:

1. Abre `.env` y cambia `OWNER_USERNAME` al nombre deseado y `OWNER_PASSWORD` a la contraseña elegida. No coloques esas claves en GitHub.
2. Con el servidor detenido, ejecuta:

   ```powershell
   npm.cmd run jefe:actualizar
   npm.cmd start
   ```

3. Entra con tus nuevos datos. Alternativamente, estando autenticado, ve a **Mi seguridad** y cambia el usuario o contraseña allí.

**Seguridad:** si una contraseña fue escrita en un chat o publicada, cámbiala antes de poner el sitio en internet. No guardamos la contraseña explícita del jefe dentro del ZIP.

## Flujo de un torneo

1. En **Personalización** selecciona 4vs4 o 6vs6, establece **Cantidad máxima = 0** para permitir inscripciones ilimitadas y **Jornadas = 2** para ida/vuelta. Guarda cambios.
2. En **Equipos y cuentas** registra cada escuadra, su logo y una cuenta de acceso. Cada equipo tendrá 6 titulares base.
3. En **Administradores**, el jefe puede crear cuentas auxiliares para quienes registren resultados.
4. El capitán o el jefe accede a la plantilla y registra suplentes adicionales mediante **AGREGAR SUPLENTE**.
5. En **Jornadas y kills** pulsa **GENERAR CALENDARIO**. Si hay 4 equipos y 2 jornadas, se crearán hasta 12 encuentros, descontando los ya existentes.
6. Pulsa **ALINEACIÓN / KILLS** junto a un partido. Selecciona los jugadores de ese duelo, incluso suplentes, y pulsa **GUARDAR ALINEACIÓN** si el partido aún no se ha disputado.
7. Cuando termine, ingresa el marcador (7–5, por ejemplo) y las kills de cada participante. Pulsa **PUBLICAR RESULTADO**. Se actualizarán la clasificación y el ranking de kills.
8. En **Enfrentamientos**, los visitantes pueden abrir **VER ALINEACIÓN**; en los partidos terminados también ven las kills individuales.

## Publicación en Railway

1. Sube el código fuente a un repositorio privado de GitHub (sin `.env`, ni `.local-data`; ambos están en `.gitignore`).
2. Crea un proyecto Railway para tu repositorio y añade el servicio de **PostgreSQL**.
3. Configura las variables de Railway en el servicio web:

   - `NODE_ENV=production`
   - `DATABASE_URL=${{Postgres.DATABASE_URL}}` *(configura mediante referencia a tu servicio PostgreSQL)*
   - `OWNER_USERNAME=Caleb` *(o el usuario que prefieras)*
   - `OWNER_PASSWORD=<clave privada fuerte>`
   - `SESSION_SECRET=<valor largo, aleatorio y secreto>`

4. Railway utiliza `railway.json` para iniciar el servidor con `npm start`. Verifica que `/health` responda correctamente.
5. Publica un dominio para el servicio web. Las estadísticas, logos y medios se conservan en PostgreSQL.
6. **Si tu cuenta del jefe ya existe en la base de Railway:** cambiar solo `OWNER_USERNAME`/`OWNER_PASSWORD` en Variables no modifica esa cuenta. Actualízala desde el panel **Mi seguridad**, o ejecuta `npm run jefe:actualizar` desde un entorno privado que tenga las variables de esa base y autorización.

## Notas de seguridad y límites técnicos

- La configuración y las contraseñas NO deben publicarse en GitHub. Las contraseñas de usuarios se guardan con hash bcrypt.
- Las fotos se limitan a 3 MB cada una y la música a 9 MB. PNG/JPG/WEBP para imágenes; MP3/OGG/WAV/M4A para audio.
- El visitante controla reproducción, pausa, volumen y silencio. El navegador normalmente requiere pulsar Play para empezar con sonido.
- No hay un máximo pequeño fijo de equipos ni de suplentes, pero el rendimiento depende del hosting y recursos disponibles.
- Un suplente con historia de partidos no se puede eliminar (para proteger sus estadísticas). Puedes cambiar su nombre o foto.
- La copia local (`.local-data`) y PostgreSQL no se sincronizan automáticamente entre sí. Si empiezas un torneo local y lo quieres migrar a Railway, debes migrar su información.
- **Antes de cambiar de versión en producción, realiza un respaldo de PostgreSQL.** Las migraciones crean nuevas tablas y amplían restricciones conservando datos existentes.

## Comandos útiles

```powershell
npm.cmd install              # Instala dependencias
npm.cmd start                # Enciende el sitio
npm.cmd run check            # Verifica la sintaxis de servidor y frontend
npm.cmd run jefe:actualizar  # Sincroniza las credenciales del jefe desde .env, con el servidor detenido
```
