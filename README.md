# JumaTabaCo — API de Microzonificación Sísmica NSR-10 (Colombia)

API REST pública que expone los **coeficientes de diseño sísmico** definidos en el
Reglamento Colombiano de Construcción Sismo Resistente **NSR-10**, organizados en la
jerarquía territorial y normativa que usa el reglamento.

> **Qué es el NSR-10:** es el reglamento sísmico vigente en Colombia. La microzonificación
> divide cada ciudad en *zonas* con valores de amplificación distintos según el tipo de
> suelo (cerros, piedemonte, lacustre, aluvial, etc.). Esta API sirve esos valores para
> que un ingeniero o un software pueda dimensionar una estructura sin tener que leer el
> PDF del reglamento.

- **API:** https://colombiaapibackend.onrender.com
- **Consumidor oficial (front):** https://jumatabacolombia.onrender.com
- **Stack:** Java 21 · Spring Boot 4.0.5 · Spring Data JPA · PostgreSQL · Spring Security + JWT
- **Formato de respuesta:** `application/json` (UTF-8)

---

## Índice

1. [Antes de empezar: el prefijo de las URLs](#antes-de-empezar-el-prefijo-de-las-urls)
2. [Tu primera consulta](#tu-primera-consulta)
3. [Modelo de datos](#modelo-de-datos)
4. [Catálogo de endpoints](#catálogo-de-endpoints)
   - [Departamentos](#departamentos)
   - [Municipios](#municipios)
   - [Microzonificaciones](#microzonificaciones)
   - [Zonas](#zonas)
5. [Guía de filtros](#guía-de-filtros)
6. [Valores de los enumerados](#valores-de-los-enumerados)
7. [Errores](#errores)
8. [Acceso y seguridad](#acceso-y-seguridad)
9. [Notas para consumidores](#notas-para-consumidores)

---

## Antes de empezar: el prefijo de las URLs

**Todas las rutas empiezan con `/apiCo/v1/`, no con `/api/v1/`.**

La `o` de "Co" es literal y está fija en el código (`@RequestMapping("/apiCo/v1/...")` en
cada controlador). Es el error más común al integrar por primera vez, así que conviene
verificarlo:

```bash
# Correcto → 200 OK con los datos
curl https://colombiaapibackend.onrender.com/apiCo/v1/departamentos

# Incorrecto → 404 Not Found
curl https://colombiaapibackend.onrender.com/api/v1/departamentos
```

Ojo también con que los nombres de los recursos **no son todos en minúscula y no son
todos en plural**. La capitalización es literal y es flexible:

| Recurso | Ruta base | Nota |
| --- | --- | --- |
| Departamentos | `/apiCo/v1/departamentos` | minúscula, plural |
| Municipios | `/apiCo/v1/municipios` | minúscula, plural |
| Microzonificaciones | `/apiCo/v1/Microzonificacion` | **con mayúscula**, **singular** |
| Zonas | `/apiCo/v1/zona` | minúscula, **singular** |

---

## Tu primera consulta

Traer todos los municipios de Colombia:

```bash
curl https://colombiaapibackend.onrender.com/apiCo/v1/municipios
```

Respuesta (recortada):

```json
[
  {
    "idMunicipio": 1118,
    "nombre": "Leticia",
    "codigoDane": "91001",
    "amenazaSismica": "BAJA",
    "aa": 0.05,
    "av": 0.05,
    "ae": 0.04,
    "ad": 0.02,
    "departamento": {
      "idDepartamento": 1,
      "nombre": "Amazonas"
    }
  },
  {
    "idMunicipio": 1641,
    "nombre": "Bogotá D.C.",
    "codigoDane": "11001",
    "amenazaSismica": "INTERMEDIA",
    "aa": 0.15,
    "av": 0.2,
    "ae": 0.13,
    "ad": 0.06,
    "departamento": {
      "idDepartamento": 15,
      "nombre": "Cundinamarca"
    }
  }
]
```

En el navegador podés pegar la URL directo y ver el JSON sin instalar nada.

Desde JavaScript (`fetch`, sin dependencias):

```js
const respuesta = await fetch(
  'https://colombiaapibackend.onrender.com/apiCo/v1/municipios'
);
const municipios = await respuesta.json();

console.log(municipios[0].nombre);              // "Leticia"
console.log(municipios[0].departamento.nombre); // "Amazonas"
```

---

## Modelo de datos

La API tiene cuatro recursos, encadenados de más general a más específico:

```
Departamento  (32 registros)   →  los 32 Departamentos + Distrito Capital
   └── Municipio  (1117 registros)  →  municipios y distritos de Colombia
          └── Microzonificacion  (3 registros)  →  tablas de coeficientes
                 └── Zona  (48 registros)  →  zonas sísmicas con sus valores
```

### Coeficientes de `Municipio`

Definen cómo se amplifica y desplaza el suelo a escala municipal.

| Campo | Significado en el NSR-10 |
| --- | --- |
| `aa` | Altura libre sobre el terreno |
| `av` | Altura de aislamiento |
| `ae` | Coeficiente de amenaza sísmica del suelo |
| `ad` | Desplazamiento horizontal relativo |
| `amenazaSismica` | Nivel cualitativo del municipio: `BAJA`, `INTERMEDIA`, `ALTA` |

### Coeficientes de `Zona`

Definen la respuesta sísmica dentro de una microzonificación.

| Campo | Significado en el NSR-10 |
| --- | --- |
| `fa` | Factor de amplificación horizontal |
| `fv` | Factor de amplificación vertical |
| `tc` | Periodo fundamental corto |
| `tl` | Periodo fundamental largo |
| `a0` | Aceleración spectra máxima |
| `t0` | Periodo propio del suelo (puede ser `null`) |
| `zonaRespuestaSismica` | Tipo de suelo: 16 valores posibles (ver [enumerados](#valores-de-los-enumerados)) |

### Cómo se anidan los datos en el JSON

La API **no devuelve identificadores sueltos: devuelve los objetos completos anidados**,
hasta 4 niveles hacia arriba. Al pedir una `Zona` obtenés su microzonificación, su municipio
y el departamento de ese municipio, sin llamadas adicionales.

```
Zona → microzonificacion → municipio → departamento
Microzonificacion → municipio → departamento
Municipio → departamento
```

Esto simplifica el consumo (una sola llamada trae todo el contexto), pero tiene un
contrapartida: **las listas anidadas se cortan hacia abajo** para evitar recursiones
infinitas. Un `Departamento` **no** trae sus `municipios`, y una `Microzonificacion` **no**
trae sus `zonas`. Para bajar de nivel hay que hacer una llamada explícita usando el
filtro disponible en [la guía de filtros](#guía-de-filtros).

---

## Catálogo de endpoints

Son **13 endpoints**, todos `GET`, todos **públicos** (no piden contraseña ni token).
Cada uno está verificado contra el servidor en producción.

### Resumen rápido

| Método | Ruta | Devuelve |
| --- | --- | --- |
| GET | `/apiCo/v1/departamentos` | Los 32 departamentos |
| GET | `/apiCo/v1/departamentos/{idDepartamento}` | Un departamento |
| GET | `/apiCo/v1/departamentos/nombre/{nombre}` | Departamento(s) por nombre |
| GET | `/apiCo/v1/municipios` | Los 1117 municipios |
| GET | `/apiCo/v1/municipios/{idMunicipio}` | Un municipio |
| GET | `/apiCo/v1/municipios/nombre/{nombre}` | Municipio(s) por nombre |
| GET | `/apiCo/v1/municipios/dane/{codigoDane}` | Un municipio por código DANE |
| GET | `/apiCo/v1/municipios/amenaza/{amenazaSismica}` | Municipio(s) por nivel de amenaza |
| GET | `/apiCo/v1/Microzonificacion` | Las 3 microzonificaciones |
| GET | `/apiCo/v1/Microzonificacion/{idMicrozonificacion}` | Una microzonificación |
| GET | `/apiCo/v1/Microzonificacion/municipio/{idMunicipio}` | Microzonificación(es) de un municipio |
| GET | `/apiCo/v1/zona` | Las 48 zonas |
| GET | `/apiCo/v1/zona/{idZona}` | Una zona |

---

### Departamentos

#### `GET /apiCo/v1/departamentos`

Devuelve los 32 departamentos sin ningún filtro. Es la respuesta más pequeña de la API
(1.4 KB), ideal para armar un desplegable.

```bash
curl https://colombiaapibackend.onrender.com/apiCo/v1/departamentos
```

```json
[
  { "idDepartamento": 1, "nombre": "Amazonas" },
  { "idDepartamento": 2, "nombre": "Antioquia" },
  { "idDepartamento": 3, "nombre": "Arauca" },
  { "idDepartamento": 4, "nombre": "Archipiélago de San Andrés, Providencia y Santa Catalina" }
]
```

#### `GET /apiCo/v1/departamentos/{idDepartamento}`

Devuelve **un solo** departamento. Si el ID no existe responde `404`.

```bash
curl https://colombiaapibackend.onrender.com/apiCo/v1/departamentos/1
```

```json
{ "idDepartamento": 1, "nombre": "Amazonas" }
```

#### `GET /apiCo/v1/departamentos/nombre/{nombre}`

Búsqueda por nombre. **Siempre devuelve una lista**, incluso si el resultado es uno solo
o cero. **Cuidado:** es búsqueda por **subcadena**, no exacta — mirá la [guía de filtros](#guía-de-filtros).

```bash
curl https://colombiaapibackend.onrender.com/apiCo/v1/departamentos/nombre/Cundinamarca
```

```json
[{ "idDepartamento": 15, "nombre": "Cundinamarca" }]
```

---

### Municipios

#### `GET /apiCo/v1/municipios`

Devuelve los 1117 municipios con su departamento anidado.

**Nota: esta es la respuesta más pesada de la API: ~207 KB de JSON en una sola llamada.**
No hay paginación (ver [Notas para consumidores](#notas-para-consumidores)). Si solo
necesitás una fila, usá `/dane/{codigoDane}` o `/{idMunicipio}` en su lugar.

```bash
curl https://colombiaapibackend.onrender.com/apiCo/v1/municipios
```

#### `GET /apiCo/v1/municipios/{idMunicipio}`

Devuelve **un solo** municipio. Responde `404` si el ID no existe.

```bash
curl https://colombiaapibackend.onrender.com/apiCo/v1/municipios/1641
```

```json
{
  "idMunicipio": 1641,
  "nombre": "Bogotá D.C.",
  "codigoDane": "11001",
  "amenazaSismica": "INTERMEDIA",
  "aa": 0.15,
  "av": 0.2,
  "ae": 0.13,
  "ad": 0.06,
  "departamento": {
    "idDepartamento": 15,
    "nombre": "Cundinamarca"
  }
}
```

> Nota: Bogotá D.C. aparece asociado a Cundinamarca. Eso es correcto según el DANE, que
> registra el Distrito Capital dentro de ese departamento con fines de agregación.

#### `GET /apiCo/v1/municipios/nombre/{nombre}`

Búsqueda por nombre, siempre devuelve lista. Subcadena, no exacta.

```bash
curl https://colombiaapibackend.onrender.com/apiCo/v1/municipios/nombre/Bogot
```

```json
[
  {
    "idMunicipio": 1641,
    "nombre": "Bogotá D.C.",
    "codigoDane": "11001",
    "amenazaSismica": "INTERMEDIA",
    "aa": 0.15,
    "av": 0.2,
    "ae": 0.13,
    "ad": 0.06,
    "departamento": { "idDepartamento": 15, "nombre": "Cundinamarca" }
  }
]
```

#### `GET /apiCo/v1/municipios/dane/{codigoDane}`

Devuelve **un solo** municipio, por su código DANE.

Este es el **filtro más preciso de la API**: la coincidencia es exacta, el `codigoDane` es
único en la base de datos, y devuelve un objeto (no una lista). Responde `404` si no existe.
Es el que conviene usar cuando ya conocés el código DANE.

```bash
curl https://colombiaapibackend.onrender.com/apiCo/v1/municipios/dane/11001
```

```json
{
  "idMunicipio": 1641,
  "nombre": "Bogotá D.C.",
  "codigoDane": "11001",
  "amenazaSismica": "INTERMEDIA",
  "aa": 0.15,
  "av": 0.2,
  "ae": 0.13,
  "ad": 0.06,
  "departamento": { "idDepartamento": 15, "nombre": "Cundinamarca" }
}
```

#### `GET /apiCo/v1/municipios/amenaza/{amenazaSismica}`

Filtra municipios por su nivel de amenaza sísmica. Coincidencia **exacta** sobre el
enumerado. Devuelve lista (puede ser vacía).

Valores válidos: `BAJA`, `INTERMEDIA`, `ALTA` (exactamente así, en mayúsculas).
Cualquier otro valor responde `400`.

```bash
curl https://colombiaapibackend.onrender.com/apiCo/v1/municipios/amenaza/ALTA
```

Distribución real de los 1117 municipios:

| Amenaza | Cantidad de municipios |
| --- | --- |
| `BAJA` | 139 |
| `INTERMEDIA` | 432 |
| `ALTA` | 546 |

```bash
# Ejemplo: contar cuántos municipios de amenaza alta hay en Cundinamarca,
# combinando este endpoint con el filtro de departamento
curl -s "https://colombiaapibackend.onrender.com/apiCo/v1/municipios/amenaza/ALTA" \
  | python -c "import sys,json; d=json.load(sys.stdin); print(len([m for m in d if m['departamento']['idDepartamento']==15]))"
```

---

### Microzonificaciones

**Este recurso tiene datos de Bogotá solamente.** Hay 3 microzonificaciones en total, y
las tres son del municipio 1641 (Bogotá D.C.). Para cualquier otro municipio la respuesta
va a ser `[]`. Esto no es un error: la microzonificación detallada a nivel de ciudad solo
está cargada para Bogotá.

#### `GET /apiCo/v1/Microzonificacion`

Devuelve las 3 microzonificaciones, con el municipio y el departamento anidados.

```bash
curl https://colombiaapibackend.onrender.com/apiCo/v1/Microzonificacion
```

```json
[
  {
    "idMicrozonificacion": 1,
    "nombre": "Coeficientes de diseño por zona Tabla 3.1",
    "municipio": {
      "idMunicipio": 1641,
      "nombre": "Bogotá D.C.",
      "codigoDane": "11001",
      "amenazaSismica": "INTERMEDIA",
      "aa": 0.15, "av": 0.2, "ae": 0.13, "ad": 0.06,
      "departamento": { "idDepartamento": 15, "nombre": "Cundinamarca" }
    }
  },
  {
    "idMicrozonificacion": 2,
    "nombre": "Coeficientes de seguridad limitada Tabla 4.1",
    "municipio": { "idMunicipio": 1641, "nombre": "Bogotá D.C.", "...": "..." }
  },
  {
    "idMicrozonificacion": 3,
    "nombre": "Coeficientes de umbral de daño Tabla 5.1",
    "municipio": { "idMunicipio": 1641, "nombre": "Bogotá D.C.", "...": "..." }
  }
]
```

> Nota: no incluyen el campo `zonas` a propósito. Para ver las zonas de una
> microzonificación, filtrá `/apiCo/v1/zona` por `microzonificacion.idMicrozonificacion`
> del lado del cliente (ver [Notas para consumidores](#notas-para-consumidores)).

#### `GET /apiCo/v1/Microzonificacion/{idMicrozonificacion}`

Devuelve **una sola** microzonificación. Responde `404` si el ID no existe.

```bash
curl https://colombiaapibackend.onrender.com/apiCo/v1/Microzonificacion/1
```

```json
{
  "idMicrozonificacion": 1,
  "nombre": "Coeficientes de diseño por zona Tabla 3.1",
  "municipio": {
    "idMunicipio": 1641,
    "nombre": "Bogotá D.C.",
    "codigoDane": "11001",
    "amenazaSismica": "INTERMEDIA",
    "aa": 0.15, "av": 0.2, "ae": 0.13, "ad": 0.06,
    "departamento": { "idDepartamento": 15, "nombre": "Cundinamarca" }
  }
}
```

#### `GET /apiCo/v1/Microzonificacion/municipio/{idMunicipio}`

Filtra microzonificaciones por municipio. Devuelve lista; `[]` si el municipio no tiene
ninguna.

```bash
# Bogotá: devuelve 3
curl https://colombiaapibackend.onrender.com/apiCo/v1/Microzonificacion/municipio/1641

# Leticia: devuelve []
curl https://colombiaapibackend.onrender.com/apiCo/v1/Microzonificacion/municipio/1118
```

```json
[]
```

---

### Zonas

#### `GET /apiCo/v1/zona`

Devuelve las 48 zonas, cada una con su microzonificación, municipio y departamento
anidados. Es la respuesta más completa en información (~20 KB).

```bash
curl https://colombiaapibackend.onrender.com/apiCo/v1/zona
```

```json
[
  {
    "idZona": 1,
    "zonaRespuestaSismica": "CERROS",
    "fa": 1.35,
    "fv": 1.3,
    "tc": 0.62,
    "tl": 3.0,
    "a0": 0.18,
    "t0": null,
    "microzonificacion": {
      "idMicrozonificacion": 1,
      "nombre": "Coeficientes de diseño por zona Tabla 3.1",
      "municipio": {
        "idMunicipio": 1641,
        "nombre": "Bogotá D.C.",
        "codigoDane": "11001",
        "amenazaSismica": "INTERMEDIA",
        "aa": 0.15, "av": 0.2, "ae": 0.13, "ad": 0.06,
        "departamento": { "idDepartamento": 15, "nombre": "Cundinamarca" }
      }
    }
  }
]
```

> Nota: el `null` en `t0` es normal, no un error. De las 48 zonas, 16 tienen `t0` con valor
> y 32 lo tienen en `null`. Conviene manejarlo explícitamente en el cliente.

#### `GET /apiCo/v1/zona/{idZona}`

Devuelve **una sola** zona. Responde `404` si el ID no existe.

```bash
curl https://colombiaapibackend.onrender.com/apiCo/v1/zona/1
```

```json
{
  "idZona": 1,
  "zonaRespuestaSismica": "CERROS",
  "fa": 1.35,
  "fv": 1.3,
  "tc": 0.62,
  "tl": 3.0,
  "a0": 0.18,
  "t0": null,
  "microzonificacion": {
    "idMicrozonificacion": 1,
    "nombre": "Coeficientes de diseño por zona Tabla 3.1",
    "municipio": {
      "idMunicipio": 1641,
      "nombre": "Bogotá D.C.",
      "codigoDane": "11001",
      "amenazaSismica": "INTERMEDIA",
      "aa": 0.15, "av": 0.2, "ae": 0.13, "ad": 0.06,
      "departamento": { "idDepartamento": 15, "nombre": "Cundinamarca" }
    }
  }
}
```

#### Cómo consultar las zonas de una microzonificación

No existe un endpoint `/zona/microzonificacion/{id}` para bajar de nivel. Como las 48 zonas
son pocas, la forma de consultar es traer la lista y filtrar en el cliente:

```js
const zonas = await fetch(
  'https://colombiaapibackend.onrender.com/apiCo/v1/zona'
).then(r => r.json());

// Zonas de la microzonificación 1
const zonasTabla31 = zonas.filter(
  z => z.microzonificacion.idMicrozonificacion === 1
);
```

---

## Guía de filtros

La API tiene **cuatro filtros**, y ninguno usa query parameters (`?campo=valor`). Todos
van como **segmentos de la URL**. No existe paginación ni ordenamiento configurable.

| Filtro | Tipo | Endpoint | Coincidencia |
| --- | --- | --- | --- |
| Por nombre | Texto | `/{recurso}/nombre/{nombre}` **Subcadena**, ignora mayúsculas |
| Por código DANE | Texto | `/municipios/dane/{codigoDane}` | ✅ Exacta, único |
| Por amenaza sísmica | Enum | `/municipios/amenaza/{amenazaSismica}` | ✅ Exacta |
| Por municipio (relación) | ID | `/Microzonificacion/municipio/{idMunicipio}` | ✅ Exacta |

### Filtro por nombre: es subcadena, no coincidencia exacta

Este es el detalle más importante de la API para un consumidor. El filtro por nombre
busca **cualquier texto que _contenga_** lo que envíes, sin distinguir mayúsculas de
minúsculas.

Esto significa que podés obtener resultados que no esperabas:

```bash
# Buscas "Santander" y te aparecen DOS resultados:
curl "https://colombiaapibackend.onrender.com/apiCo/v1/departamentos/nombre/santander"
```

```json
[
  { "idDepartamento": 23, "nombre": "Norte de Santander" },
  { "idDepartamento": 27, "nombre": "Santander" }
]
```

El `23` aparece porque "Norte de Santander" **contiene** la subcadena "santander".

Otros ejemplos reales del comportamiento:

```bash
# Una subcadena suelta trae muchos resultados (21 municipios)
curl "https://colombiaapibackend.onrender.com/apiCo/v1/municipios/nombre/Santa"

# Las mayúsculas no afectan: "BOGOT" encuentra "Bogotá D.C."
curl "https://colombiaapibackend.onrender.com/apiCo/v1/municipios/nombre/BOGOT"
```

**Cómo usarlo bien:**

- ✅ Buscá por **fragmentos largos** y únicos (`"Bogot"`, `"Cundinamarca"`) — es el uso
  previsto: es un buscador incremental para un autocompletado.
- ✅ **Filtrá y ordená del lado del cliente** si necesitás coincidencia estricta:

  ```js
  const exactos = resultados.filter(d => d.nombre === textoBuscado);
  ```

- ❌ **No lo uses para validar existencia** de un nombre exacto. Para eso están
  `/municipios/dane/{codigoDane}` o los endpoints por ID, que sí son exactos.
- Los caracteres especiales en la URL hay que **codificarlos en el path**
  (`Bogot%C3%A1` para `Bogotá`).

### Filtros por enumerado: son exactos y sensibles a mayúsculas

Los filtros que reciben un `enum` solo aceptan los valores exactos:

```bash
curl "https://colombiaapibackend.onrender.com/apiCo/v1/municipios/amenaza/ALTA"  # 200 OK
curl "https://colombiaapibackend.onrender.com/apiCo/v1/municipios/amenanza/ALTA"  # 404 Not Found
```

Cualquier valor fuera de la lista produce `400 Bad Request`:

```bash
curl "https://colombiaapibackend.onrender.com/apiCo/v1/municipios/amenaza/NOEXISTE"
```

```json
{
  "timestamp": "2026-09-27T00:01:52.054Z",
  "status": 400,
  "error": "Bad Request",
  "path": "/apiCo/v1/municipios/amenaza/NOEXISTE"
}
```

Para consultar el conjunto válido desde el código y construir el desplegable:

```js
const NIVELES_AMENAZA = ['BAJA', 'INTERMEDIA', 'ALTA'];
```

### Encadenar filtros no está soportado

La API expone **un filtro por llamada**. No podés pedir
`/municipios/amenaza/ALTA?departamento=15` ni combinar filtros en la URL: los query
parameters se **ignoran silenciosamente** (no dan error, simplemente no filtran).

Para combinar criterios, hacé la llamada y filtrá en el cliente:

```js
// Traer municipios de amenaza alta
const altos = await fetch(
  'https://colombiaapibackend.onrender.com/apiCo/v1/municipios/amenaza/ALTA'
).then(r => r.json());

// Filtrar por departamento en el cliente
const deCundinamarca = altos.filter(
  m => m.departamento.idDepartamento === 15
);
```

Esto funciona bien mientras el conjunto sea acotado, pero es exactamente el motivo por el
que el filtro por amenaza puede devolver ~100 KB: no admite filtros adicionales en la
misma llamada.

### No hay filtro por `zonaRespuestaSismica`

`Zona` tiene un enumerado de 16 tipos de suelo, pero **no hay ningún endpoint para filtrar
zonas por él**. Solo podés obtener zonas por ID o por la lista completa (y filtrar en el
cliente). Si tu caso de uso es "dame todas las zonas aluviales", la lista completa + filtro
local es la única vía.

---

## Valores de los enumerados

### `AmenazaSismica` (municipio) — 3 valores

| Valor | Municipios |
| --- | --- |
| `BAJA` | 139 |
| `INTERMEDIA` | 432 |
| `ALTA` | 546 |

### `ZonaRespuestaSismica` (zona) — 16 valores

Los 16 están presentes en la base, con 3 zonas cada uno (48 en total).

| Valor | Zonas |
| --- | --- |
| `CERROS` | 3 |
| `PIEDEMONTE_A` | 3 |
| `PIEDEMONTE_B` | 3 |
| `PIEDEMONTE_C` | 3 |
| `LACUSTRE_50` | 3 |
| `LACUSTRE_100` | 3 |
| `LACUSTRE_200` | 3 |
| `LACUSTRE_300` | 3 |
| `LACUSTRE_500` | 3 |
| `LACUSTRE_ALUVIAL_200` | 3 |
| `LACUSTRE_ALUVIAL_300` | 3 |
| `ALUVIAL_50` | 3 |
| `ALUVIAL_100` | 3 |
| `ALUVIAL_200` | 3 |
| `ALUVIAL_300` | 3 |
| `DEPÓSITO_LADERA` | 3 |

> **`DEPÓSITO_LADERA` lleva `Ó` acentuada en el valor.** Es el único valor con tilde, y
> es una trampa clásica: si lo escribís como `DEPOSITO_LADERA` (sin tilde) no vas a obtener
> coincidencia. Lo mismo al construir comparaciones en tu código — normalizá o compará
> exacto contra el string con tilde.

---

## Errores

Todos los errores usan la misma forma, que es la que produce Spring Boot por defecto:

```json
{
  "timestamp": "2026-09-27T00:01:51.901Z",
  "status": 404,
  "error": "Not Found",
  "path": "/apiCo/v1/municipios/999999"
}
```

| Código | Cuándo ocurre |
| --- | --- |
| `200` | Consulta exitosa |
| `400 Bad Request` | Valor de enumerado inválido en la URL |
| `404 Not Found` | El recurso solicitado por ID o DANE no existe |
| `500 Internal Server Error` | Error interno del servidor |

Ejemplo de `404` (municipio con ID inexistente):

```bash
curl https://colombiaapibackend.onrender.com/apiCo/v1/municipios/999999
```

```json
{
  "timestamp": "2026-09-27T00:01:51.901Z",
  "status": 404,
  "error": "Not Found",
  "path": "/apiCo/v1/municipios/999999"
}
```

**Dos advertencias importantes sobre los errores:**

1. **El mensaje es genérico.** Aunque el backend tiene mensajes descriptivos internos
   (del tipo `"el municipio con ese codigo dane no existe"`), **no llegan al cliente**. El
   campo `error` siempre vale `Not Found` o `Bad Request`. Si tu UI necesita mostrar un
   mensaje más útil, tenés que construirlo vos a partir del código de estado.

2. **No hay mensaje cuando el filtro por nombre no encuentra nada.** Un filtro por nombre
   sin coincidencias devuelve `200` con `[]` — no es un `404`. Solo los endpoints por ID
   y por DANE devuelven `404`.

Como los nombres de campo son estables, podés chequear el estado de forma segura:

```js
const r = await fetch(url);
if (r.status === 404) {
  // el ID o el código DANE no existe
} else if (!r.ok) {
  // error de servidor
}
```

---

## Acceso y seguridad

### Los `GET` son públicos

**Los 13 endpoints de este documento son de acceso público y anónimo.** No requieren
`Authorization`, ni token, ni cuenta, ni registro. Podés llamarlos directamente desde el
navegador, desde Postman, o desde tu propio sitio.

Esto es deliberado: son datos regulatorios públicos de consulta general, pensados para que
cualquiera los use.

### La escritura exige autenticación

La API **no es de solo lectura**. Detrás de estos endpoints `GET` existen endpoints de
`POST`, `PUT` y `DELETE` para crear, modificar y eliminar departamentos, municipios,
microzonificaciones y zonas, y son los que permiten **cargar o corregir los datos
normativos**.

Pero todos ellos están **protegidos con JWT** y son inalcanzables sin autenticación: la
única forma de escribir o borrar es **estar autenticado**. Sin un token válido, un `POST`
o un `DELETE` recibe `401 Unauthorized` y no modifica nada.

En resumen:

| Método | Acceso |
| --- | --- |
| `GET` | Público, sin credenciales |
| `POST`, `PUT`, `DELETE` | Requiere token JWT (autenticación) |

Es decir: **consultar es libre; modificar y eliminar no.** El diseño es "lectura abierta,
escritura cerrada" — el dato es público, pero la fuente de verdad está protegida para que
solo quien administra la norma pueda corregirla.

> El flujo de autenticación (login, emisión de token, permisos) queda fuera del alcance de
> este documento, que es exclusivamente de consulta.

---

## Notas para consumidores

Limitaciones y comportamientos reales del servicio, para no llevarte sorpresas al
integrar.

### No hay paginación

Ninguna respuesta está paginada. `GET /apiCo/v1/municipios` devuelve los 1117 municipios
completos en **una sola respuesta de ~207 KB**, cada vez.

Qué implica en la práctica:

- No existen los query parameters `page`, `size`, `offset` ni `limit`: se ignoran en
  silencio.
- No hay un total de registros en un header ni en el body.
- No hay forma de pedir "los municipios 500 a 1000": hay que traer los 1117 y descartar
  lo que no se necesite.
- **El orden no está garantizado.** La base no tiene criterio de orden explícito, así que
  no confíes en que dos llamadas consecutivas devuelvan los registros en el mismo orden.
  Si necesitás orden estable, ordená en el cliente.

Para la próxima versión, agregá `?page=0&size=50` y ordenamiento por parámetro.

### La cobertura de datos no es uniforme

Esto es lo más importante para interpretar los resultados:

| Recurso | Cobertura |
| --- | --- |
| Departamentos | Nacional (32) |
| Municipios | Nacional (1117) |
| Microzonificaciones | **Solo Bogotá** (3) |
| Zonas | **Solo Bogotá** (48) |

Los municipios y departamentos cubren todo el país, pero la **microzonificación
detallada solo está cargada para Bogotá D.C.**. Para los otros 1116 municipios no hay
microzonificaciones ni zonas, y la API responde `[]` de forma correcta.

No confundas un `[]` con un fallo: significa "no hay microzonificación cargada para ese
municipio", no que la consulta esté mal.

### `t0` puede ser `null`

De las 48 zonas, 16 tienen valor en `t0` y 32 lo tienen en `null`. Es un dato que el
reglamento no siempre define. Manejalo explícitamente en el cliente y no asumas que es un
número:

```js
const tieneT0 = typeof zona.t0 === 'number' ? zona.t0.toFixed(2) : 'No aplica';
```

### Codificación de caracteres

Los datos están en **UTF-8 correcto** — "Bogotá", "Diseño", "Archipiélago" se guardan y
se sirven bien. Pero el header `Content-Type` viene como `application/json` **sin**
`charset=UTF-8`.

Qué implica:

- Navegadores, `fetch`, `axios`, Postman e `httpie` lo decodifican bien. Es el caso normal.
- Algunos clientes estrictos o librerías de bajo nivel pueden mal decodificar los acentos
  si asumen ISO-8859-1. Si ves `Bogot?` o `dise?o`, es el cliente, no el dato.

### CORS

Está habilitado y verificado para el front oficial
(`https://jumatabacolombia.onrender.com`):

```
Access-Control-Allow-Origin: https://jumatabacolombia.onrender.com
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 3600
```

Si integrás desde **otro** dominio distinto al front oficial, el navegador va a bloquear
las peticiones por CORS. Es una restricción del servidor, no del navegador.

### Disponibilidad

El servicio está alojado en **Render** con plan gratuito. Los planes gratuitos de Render
apagan el servicio cuando no hay tráfico y lo reinstate con retraso, así que la primera
consulta después de un rato sin uso puede tardar o fallar. Si vas a usar esto en
producción, **llamá una vez para despertar el servicio** y tené un manejo de reintentos.

### Resumen de lo que la API no tiene

Para que no la busques, la API **no** ofrece: paginación, ordenamiento configurable,
filtros combinables, búsqueda de texto libre con ranking, filtro por `zonaRespuestaSismica`,
filtro por rango de fechas (no hay fechas en el modelo), filtro por rango numérico de
coeficientes, ni endpoint para bajar de una microzonificación a sus zonas.

---

## Ejemplo completo de consumo

Consultar los coeficientes de diseño sísmico de una zona de Bogotá a partir de su código
DANE, con el flujo de llamadas que haría un cliente real:

```js
const API = 'https://colombiaapibackend.onrender.com/apiCo/v1';

// 1. Buscar el municipio por código DANE (coincidencia exacta)
const municipio = await fetch(`${API}/municipios/dane/11001`).then(r => r.json());
// → { idMunicipio: 1641, nombre: "Bogotá D.C.", amenazaSismica: "INTERMEDIA", ... }

// 2. Ver si tiene microzonificaciones
const microzonas = await fetch(
  `${API}/Microzonificacion/municipio/${municipio.idMunicipio}`
).then(r => r.json());
// → 3 resultados, todas de Bogotá

// 3. Traer las zonas y quedarse con las de la primera microzonificación
const todasLasZonas = await fetch(`${API}/zona`).then(r => r.json());
const zonas = todasLasZonas.filter(
  z => z.microzonificacion.idMicrozonificacion === microzonas[0].idMicrozonificacion
);

// 4. Mostrar los coeficientes
for (const zona of zonas) {
  console.log(`${zona.zonaRespuestaSismica}: fa=${zona.fa} fv=${zona.fv} tc=${zona.tc}`);
  // Ej: CERROS: fa=1.35 fv=1.3 tc=0.62
  //      PIEDEMONTE_A: fa=1.65 fv=2 tc=0.78
  //      PIEDEMONTE_B: fa=1.95 fv=1.7 tc=0.56
}
```

---

## Licencia y contacto

Los datos corresponden al Reglamento Colombiano de Construcción Sismo Resistente
**NSR-10** (Ministerio de Vivienda, Ciudad y Territorio). Consultá la norma oficial antes
de usar estos coeficientes con fines de cálculo estructural formal.
