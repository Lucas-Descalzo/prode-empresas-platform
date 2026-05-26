# Implementacion Inicial - PRODE Empresas Platform

Fecha: 2026-05-26

## Lo que quedo hecho

- Se creo una tercera app independiente para B2B, separada del proyecto original de amigos y separada de la demo comercial.
- Se dejo conectada la nueva app a Vercel y a Supabase mediante las variables de entorno del proyecto `prode-empresas-platform`.
- Se definio una base multiempresa en Postgres con tablas para:
  - empresas
  - branding
  - dominios
  - usuarios por empresa
  - credenciales
  - predicciones
  - resultados oficiales
  - rate limiting basico

## Producto y rutas

- Se reemplazo la portada heredada por una home B2B en `/`.
- Se creo un panel operador global en `/admin`.
- Se mantuvo la experiencia de empresa bajo `/c/[slug]`.
- Se agrego soporte de resolucion por subdominio con `proxy.ts`, para que luego `empresa.prode-empresas.com` apunte a su tenant.

## Operacion B2B

- Se puede crear una empresa nueva sin tocar codigo.
- Cada empresa guarda:
  - slug
  - nombre visible
  - nombre corto
  - tagline
  - modo de juego
  - modo de acceso
  - dominio principal
  - branding base
- Se puede importar participantes desde texto pegado con:
  - nombre completo
  - email
  - area opcional
- Se generan contrasenas temporales para cada participante importado.
- Se puede resetear la contrasena temporal de un usuario desde el panel operador.

## Login y seguridad

- Se reemplazo el acceso demo por login real con email + contrasena temporal.
- Se fuerza cambio de contrasena en el primer ingreso.
- Se implementaron sesiones firmadas para participantes.
- El panel admin corporativo usa clave global de operador, no una clave expuesta por empresa.

## Juego y ranking

- Quedo operativo el modo interactivo para:
  - fase de grupos
  - eliminacion directa
  - guardado de predicciones
  - ranking por empresa
  - carga de resultados oficiales
  - recalculo de puntos
- Se aislo toda la informacion por empresa.

## Verificaciones hechas

- `npm run build` paso correctamente.
- `npm test` paso correctamente.

## Pendientes naturales de la siguiente etapa

- Terminar la interfaz completa del `gameMode = simple`.
- Agregar una mejor experiencia de exportacion o mailing de credenciales.
- Configurar dominio real y wildcard en Vercel.
- Definir si la empresa podra autoregistrarse por dominio corporativo o si seguira solo con padrón importado.
- Revisar y eventualmente retirar rutas heredadas del proyecto original que hoy siguen presentes en el codigo base pero no forman parte del offering B2B.

## Variables importantes para produccion

- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `APP_ROOT_DOMAIN`
- Variables de Supabase / Postgres ya vinculadas desde Vercel
