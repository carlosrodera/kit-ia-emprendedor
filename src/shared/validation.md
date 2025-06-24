# Módulo de Validación y Sanitización

## Descripción
Este módulo proporciona funciones de validación y sanitización seguras para prevenir ataques XSS y otros vectores de ataque comunes en aplicaciones web.

## Instalación
El módulo ya está incluido en el proyecto. Las dependencias necesarias son:
- `dompurify`: Para sanitización de HTML

## Uso Básico

### Importar el módulo
```javascript
import { 
  validatePromptTitle,
  validatePromptContent,
  validateTags,
  validateSearch,
  validateUrl,
  validateEmail,
  sanitizeHtml,
  escapeHtml
} from '@shared/validation';
```

## Funciones Disponibles

### 1. Validación de Títulos de Prompts
```javascript
const result = validatePromptTitle('Mi Prompt de Marketing');
// { valid: true }

const result = validatePromptTitle('AB'); // Muy corto
// { valid: false, error: 'El título debe tener al menos 3 caracteres' }
```

**Reglas:**
- Mínimo 3 caracteres
- Máximo 100 caracteres
- Solo letras, números, espacios, guiones y guiones bajos
- Soporta caracteres españoles (ñ, acentos)

### 2. Validación de Contenido
```javascript
const result = validatePromptContent('Este es el contenido de mi prompt...');
// { valid: true }
```

**Reglas:**
- Mínimo 10 caracteres
- Máximo 5000 caracteres
- Cualquier contenido es válido (se sanitiza después)

### 3. Validación de Tags
```javascript
const result = validateTags(['marketing', 'ventas', 'SEO']);
// { valid: true }

const result = validateTags(['tag1', 'tag1']); // Duplicados
// { valid: false, error: 'No se permiten tags duplicados' }
```

**Reglas:**
- Máximo 10 tags
- Máximo 30 caracteres por tag
- Sin tags duplicados (case-insensitive)
- Sin caracteres especiales

### 4. Validación y Sanitización de Búsquedas
```javascript
const result = validateSearch('  término de búsqueda  ');
// { valid: true, sanitized: 'término de búsqueda' }

const result = validateSearch('<script>alert("XSS")</script>');
// { valid: true, sanitized: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;' }
```

**Características:**
- Normaliza espacios múltiples
- Escapa caracteres HTML
- Máximo 100 caracteres

### 5. Validación de URLs
```javascript
const result = validateUrl('https://example.com');
// { valid: true }

const result = validateUrl('example.com'); // Sin protocolo
// { valid: false, error: 'La URL no es válida. Debe comenzar con http:// o https://' }
```

**Reglas:**
- Debe incluir protocolo (http:// o https://)
- No permite URLs locales (localhost, 127.0.0.1)

### 6. Validación de Email
```javascript
const result = validateEmail('usuario@ejemplo.com');
// { valid: true }
```

**Reglas:**
- Formato válido de email
- No permite puntos consecutivos
- No puede empezar o terminar con punto
- Máximo 254 caracteres

### 7. Sanitización de HTML
```javascript
const clean = sanitizeHtml('<p>Texto <script>alert("XSS")</script><b>seguro</b></p>');
// '<p>Texto <b>seguro</b></p>'
```

**Tags permitidos por defecto:**
- `b`, `i`, `em`, `strong`, `a`, `br`, `p`, `ul`, `ol`, `li`

**Atributos permitidos:**
- `href`, `target`, `rel` (solo en enlaces)

### 8. Escape de HTML
```javascript
const escaped = escapeHtml('<script>alert("XSS")</script>');
// '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
```

## Validación de Formularios Completos

```javascript
const schema = {
  email: {
    label: 'Email',
    required: true,
    validator: validateEmail
  },
  name: {
    label: 'Nombre',
    required: true,
    type: 'string',
    typeOptions: { minLength: 3, maxLength: 50 }
  },
  age: {
    label: 'Edad',
    required: false,
    type: 'number',
    typeOptions: { min: 18, max: 120, integer: true }
  }
};

const formData = {
  email: 'usuario@ejemplo.com',
  name: 'Juan Pérez',
  age: 25
};

const result = validateForm(formData, schema);
// { valid: true, errors: {} }
```

## Integración con la UI

### Ejemplo con validación en tiempo real:
```javascript
// En popup.js o sidebar
import { validatePromptTitle, sanitizeHtml } from '@shared/validation';

// Al guardar un prompt
async function savePrompt(promptData) {
  // Validar título
  const titleValidation = validatePromptTitle(promptData.title);
  if (!titleValidation.valid) {
    showError(titleValidation.error);
    return;
  }
  
  // Sanitizar contenido antes de guardar
  const sanitizedContent = sanitizeHtml(promptData.content);
  
  // Guardar en storage
  await storage.savePrompt({
    ...promptData,
    content: sanitizedContent
  });
}

// Validación mientras el usuario escribe
titleInput.addEventListener('input', (e) => {
  const validation = validatePromptTitle(e.target.value);
  
  if (!validation.valid) {
    titleError.textContent = validation.error;
    titleError.style.display = 'block';
  } else {
    titleError.style.display = 'none';
  }
});
```

## Consideraciones de Seguridad

1. **Siempre sanitizar antes de mostrar**: Cualquier contenido que venga del usuario o de fuentes externas debe ser sanitizado antes de mostrarse en la UI.

2. **Validar en el cliente Y en el servidor**: Aunque este módulo está diseñado para el cliente, si tienes un backend, siempre valida también allí.

3. **Escapar vs Sanitizar**:
   - Usa `escapeHtml()` cuando necesites mostrar el código HTML literal
   - Usa `sanitizeHtml()` cuando quieras permitir HTML seguro

4. **Configuración personalizada**: Puedes pasar opciones adicionales a `sanitizeHtml()` para permitir más tags si es necesario:

```javascript
const options = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'code', 'pre'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
};

const sanitized = sanitizeHtml(htmlContent, options);
```

## Tests

El módulo incluye tests exhaustivos. Para ejecutarlos:

```bash
npm test src/shared/validation.test.js
```

## Límites Configurables

Los límites están definidos como constantes y pueden ser importados si necesitas mostrarlos en la UI:

```javascript
import { LIMITS } from '@shared/validation';

console.log(`Máximo ${LIMITS.TAG_MAX_COUNT} tags permitidos`);
```