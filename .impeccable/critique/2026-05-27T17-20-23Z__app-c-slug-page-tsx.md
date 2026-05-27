---
target: TM Boxing implementation
total_score: 24
p0_count: 0
p1_count: 2
timestamp: 2026-05-27T17-20-23Z
slug: app-c-slug-page-tsx
---
## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | El guardado y el estado del fixture se comunican bien, pero compiten con demasiados otros acentos visuales. |
| 2 | Match System / Real World | 3 | El copy ya habla mejor para comunidad, aunque todavía hay rastros de un tono base demasiado genérico. |
| 3 | User Control and Freedom | 2 | El flujo es claro, pero no ofrece atajos, undo real ni una salida liviana para usuarios expertos. |
| 4 | Consistency and Standards | 2 | La marca TM Boxing convive con colores y patrones heredados del producto base. |
| 5 | Error Prevention | 2 | Hay autosave y cierre por fecha, pero los roles de color no previenen bien errores de interpretación. |
| 6 | Recognition Rather Than Recall | 3 | La estructura general es visible, aunque los estados visuales requieren aprendizaje por exceso de señales. |
| 7 | Flexibility and Efficiency | 1 | No hay camino rápido para usuarios frecuentes ni mobile power users. |
| 8 | Aesthetic and Minimalist Design | 2 | La pantalla ya tiene personalidad, pero todavía acumula demasiados bloques, pills y brillos. |
| 9 | Error Recovery | 3 | Los mensajes de guardado son razonables y el estado no parece perderse fácilmente. |
| 10 | Help and Documentation | 3 | FAQs y sistema de puntos existen, pero siguen estando más como bloque agregado que como ayuda contextual. |
| **Total** | | **24/40** | **Acceptable** |

## Anti-Patterns Verdict
**LLM assessment**: ya no se siente como una demo genérica, pero todavía se ve como un theme swap fuerte sobre una base anterior. El problema central no es falta de branding, sino branding incompleto: la marca aparece, pero el sistema visual no está plenamente subordinado a ella.

**Deterministic scan**: el detector del skill no pudo correr porque devolvió `bundled detector not found`. Como reemplazo, revisé los archivos fuente y encontré evidencia concreta de restos visuales heredados en `components/corporate/corporate-shell.module.css` y `components/world-cup-app.module.css`, incluyendo defaults hardcodeados, gradientes teal/naranja y clases temáticas previas.

## Overall Impression
La dirección general es correcta: negro, amarillo, tono más de comunidad y un flujo simple mejor explicado. Lo que falta ahora es disciplina de sistema. TM Boxing ya está “presente”, pero todavía no “ordena” toda la interfaz.

## What's Working
- El tono de copy mejoró bastante y ahora suena más a comunidad que a empresa.
- La separación landing / plataforma / ranking es una estructura sensata para vender y usar el producto.
- El bloque de sistema de puntos y FAQs reduce ambigüedad real del modo simple.

## Priority Issues
### [P1] Sistema de marca incompleto
**Why it matters**: la experiencia sigue mostrando capas visuales del producto base, así que la personalización no termina de sentirse propia.
**Fix**: mover todos los colores y superficies importantes a tokens semánticos de marca y eliminar hardcodes heredados del fixture original.
**Suggested command**: `impeccable colorize`

### [P1] El amarillo está haciendo demasiados trabajos a la vez
**Why it matters**: hoy marca identidad, CTA, tab activo, warning, badges, highlights y pasos. Eso aplana la jerarquía y hace que nada sea realmente prioritario.
**Fix**: separar estrictamente color de marca y color de estado. Amarillo para acción principal y foco actual; verde/teal para completado; neutros para estructura.
**Suggested command**: `impeccable distill`

### [P2] Jerarquía visual y ritmo vertical demasiado uniformes
**Why it matters**: landing y flujo simple se leen como una pila de módulos de peso parecido, en vez de conducir al usuario hacia una acción principal.
**Fix**: comprimir el preámbulo del flujo simple, darle un patrón más protagonista al hero y bajar el peso visual de FAQs y tarjetas repetidas.
**Suggested command**: `impeccable layout`

### [P2] Integración de logo repetitiva en lugar de compuesta
**Why it matters**: el logo aparece en header, hero y watermark, pero no termina de construir un lockup memorable; solo repite el mismo asset en distintos tamaños.
**Fix**: definir tres niveles claros: utility logo en header, lockup principal en hero y recurso decorativo sutil como watermark.
**Suggested command**: `impeccable polish`

### [P2] Mobile todavía prioriza marco visual sobre velocidad de tarea
**Why it matters**: el usuario móvil llega a muchos bloques de contexto antes del cuadro y de la acción principal. Eso suma fricción en un flujo que debería ser inmediato.
**Fix**: reducir altura sticky, condensar métricas/estado, y priorizar llevar antes al builder en móvil.
**Suggested command**: `impeccable adapt`

## Persona Red Flags
**Jordan (First-Timer)**: entiende mejor la propuesta que antes, pero sigue viendo demasiadas señales amarillas iguales y demasiados bloques con peso parecido antes de entrar en acción.

**Alex (Power User)**: no tiene atajos ni una versión comprimida del flujo. El sistema lo obliga a atravesar capas visuales y de contexto antes de llegar al trabajo.

**Casey (Distracted Mobile User)**: el flujo móvil ya es más fluido, pero todavía hay demasiada UI por encima del contenido central. El builder debería sentirse más cerca del thumb zone y menos precedido por resumen.

## Minor Observations
- Hay clases y artefactos ajenos a TM Boxing todavía presentes, como `cocaLogo`.
- El producto shared sigue cargando gradientes y acentos de color que compiten con la marca.
- Varias superficies usan el mismo radio, densidad y sombra, lo que vuelve monótono el ritmo.

## Questions to Consider
- ¿Querés que TM Boxing se sienta más “club premium” o más “herramienta interna sólida”?
- ¿El hero debería vender la experiencia o llevar al usuario a jugar casi de inmediato?
- ¿En mobile priorizamos lectura de contexto o acceso rápido al cuadro?
