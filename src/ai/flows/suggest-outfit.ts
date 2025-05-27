
// src/ai/flows/suggest-outfit.ts
'use server';

/**
 * @fileOverview Flujo para sugerir atuendos. Permite a los usuarios obtener sugerencias de atuendos basadas en su armario y una ocasión.
 *
 * - suggestOutfit - Una función que sugiere un atuendo.
 * - SuggestOutfitInput - El tipo de entrada para la función suggestOutfit.
 * - SuggestOutfitOutput - El tipo de retorno para la función suggestOutfit.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Esquema para prendas individuales del armario enviadas a la IA
const WardrobeItemForAISchema = z.object({
  id: z.string().describe('El ID único de la prenda de vestir.'),
  type: z.string().describe('El tipo de prenda (ej. camisa, pantalón, vestido).'),
  color: z.string().describe('El color de la prenda.'),
  season: z.string().describe('La temporada para la que la prenda es más adecuada.'),
  material: z.string().describe('El material de la prenda.'),
  // imageUrl se omite intencionalmente aquí; la IA usará el ID para referirse a las prendas.
});

const SuggestOutfitInputSchema = z.object({
  occasion: z.string().describe('La ocasión para la cual sugerir un atuendo.'),
  wardrobe: z
    .array(WardrobeItemForAISchema)
    .describe("Las prendas del armario del usuario, cada una con un ID y atributos. La IA debe usar el ID para referirse a las prendas."),
  attemptNumber: z.number().optional().describe('Un número opcional que indica el intento de generación de sugerencia, para fomentar la variabilidad. Si es > 1, se espera una sugerencia diferente a intentos previos para la misma ocasión.'),
});
export type SuggestOutfitInput = z.infer<typeof SuggestOutfitInputSchema>;

// Esquema para las prendas devueltas por la IA como parte de la sugerencia
const SuggestedItemSchema = z.object({
  id: z.string().describe("El ID de la prenda seleccionada del armario del usuario. Este ID DEBE coincidir con uno de los IDs de la lista de prendas del armario de entrada."),
  type: z.string().describe('El tipo de prenda (ej. camisa, pantalón, vestido), copiado o inferido de la prenda original del armario.').optional(),
  color: z.string().describe('El color de la prenda, copiado o inferido de la prenda original del armario.').optional(),
  season: z.string().describe('La temporada para la que la prenda es más adecuada, copiada o inferida.').optional(),
  material: z.string().describe('El material de la prenda, copiado o inferido.').optional(),
  // La IA no devuelve imageUrl; el cliente la reconstruye usando el ID.
});

const SuggestOutfitOutputSchema = z.object({
  outfitSuggestion: z
    .array(SuggestedItemSchema)
    .describe("Un array de prendas seleccionadas del armario del usuario. Cada prenda DEBE incluir su 'id' original. Otros campos como 'type', 'color' son útiles si se devuelven.")
    .optional(), 
  reasoning: z.string().describe('El razonamiento detrás de la sugerencia del atuendo. Este campo es obligatorio, incluso si no se sugiere ningún atuendo o si faltan prendas.'),
});
export type SuggestOutfitOutput = z.infer<typeof SuggestOutfitOutputSchema>;

export async function suggestOutfit(input: SuggestOutfitInput): Promise<SuggestOutfitOutput> {
  return suggestOutfitFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestOutfitPrompt',
  input: {schema: SuggestOutfitInputSchema},
  output: {schema: SuggestOutfitOutputSchema},
  config: {
    temperature: 0.95, // Temperatura alta para variabilidad
  },
  prompt: `Eres un estilista de moda experto, extremadamente detallista, creativo y con un excelente sentido de la coherencia visual y semántica. Tu idioma principal es ESPAÑOL. Te encanta descubrir combinaciones únicas y asegurarte de que cada sugerencia sea diferente y bien adaptada.

Tu tarea es analizar el armario del usuario, la ocasión proporcionada y el número de intento para sugerir un ATUENDO COMPLETO Y COHERENTE.
**MUY IMPORTANTE PARA LA VARIEDAD:** {{#if attemptNumber}} {{#if (eq attemptNumber 1)}} Esta es la primera sugerencia para esta ocasión. {{else}} Este es el intento número {{{attemptNumber}}} para esta ocasión. **ESFUÉRZATE MUCHO MÁS por ofrecer alternativas SIGNIFICATIVAMENTE DISTINTAS Y VARIADAS** a las que podrías haber ofrecido antes. No repitas atuendos ni ideas similares. Cada sugerencia debe sentirse fresca y novedosa. {{/if}} {{else}} Esfuérzate por ofrecer alternativas distintas si se te pide la misma ocasión múltiples veces. {{/if}}

Un atuendo completo y coherente generalmente consiste en:
1.  Una (1) prenda superior principal (ej. camisa, blusa, jersey, camiseta).
2.  Una (1) prenda inferior principal (ej. pantalón, falda, shorts).
3.  Un (1) par de calzado adecuado (ej. zapatos, zapatillas, botas, sandalias).
4.  Opcionalmente, un (1) accesorio si complementa bien y es relevante para la ocasión (ej. bolso, cinturón, bufanda, sombrero).
(Nota: Si la prenda principal es un 'Entero' como un vestido o mono, este cuenta como parte superior e inferior. Aún así, necesitarás calzado y, opcionalmente, un accesorio).

Ocasión: {{{occasion}}}

Prendas disponibles en el armario del usuario (Presta MUCHA ATENCIÓN a los detalles de cada prenda, especialmente el 'id', 'type', 'color', 'season' y 'material' para asegurar la coherencia):
{{#each wardrobe}}
- Prenda: ID={{id}}, Tipo={{type}}, Color={{color}}, Temporada={{season}}, Material={{material}}
{{/each}}

Instrucciones CRUCIALES Y OBLIGATORIAS:
1.  **Selección de Prendas:** Selecciona prendas ÚNICAMENTE de la lista del armario proporcionada arriba. NO inventes prendas. Asegúrate de que las prendas seleccionadas sean apropiadas para la 'season' si la ocasión lo implica (ej. no sugieras un abrigo de lana para un "día de playa en verano").
2.  **IDs Obligatorios en 'outfitSuggestion':** Para CADA PRENDA que incluyas en tu array 'outfitSuggestion', DEBES devolver su 'id' original de la lista de arriba. Este campo 'id' es ABSOLUTAMENTE FUNDAMENTAL. Es el dato más importante de cada prenda sugerida.
3.  **Detalles Adicionales en 'outfitSuggestion' (MUY RECOMENDADO):** Si es posible, incluye también los campos 'type', 'color', 'season', y 'material' para cada prenda sugerida en 'outfitSuggestion', copiándolos de la información original del armario. Esto ayuda a la visualización y coherencia.
4.  **No Incluir 'imageUrl':** NO incluyas 'imageUrl' en tu respuesta estructurada.
5.  **Razonamiento Obligatorio, Detallado y Coherente (en ESPAÑOL):**
    *   Proporciona SIEMPRE un 'reasoning' explicando por qué elegiste esas prendas.
    *   **IMPORTANTE SOBRE EL RAZONAMIENTO:** Cuando te refieras a prendas específicas en tu explicación textual para el usuario ('reasoning'), DEBES hacerlo usando su 'type' y 'color' (por ejemplo, "la camisa azul", "el pantalón negro"). **BAJO NINGUNA CIRCUNSTANCIA incluyas el 'id' de ninguna prenda en el texto del 'reasoning'**. El campo 'id' es solo para la parte estructurada 'outfitSuggestion' de la salida.
    *   Explica cómo las prendas combinan entre sí visual y semánticamente para la ocasión. Justifica por qué el conjunto es COHERENTE.
    *   **Si no puedes formar un atuendo completo y coherente** con las prendas disponibles (por ejemplo, si faltan zapatos adecuados para la ocasión, o no hay una prenda inferior que combine con la superior elegida), tu 'reasoning' DEBE explicar claramente por qué no fue posible y QUÉ TIPO DE PRENDAS FALTAN O NO SON ADECUADAS. Por ejemplo: "No se pudo formar un atuendo completo para 'Boda Formal' porque no se encontraron zapatos de vestir en el armario. Se necesitarían unos tacones o zapatos elegantes." o "Para un día de invierno, faltaría una chaqueta abrigada. Con las prendas actuales, el atuendo no sería apropiado para el frío." o "Aunque hay varias prendas superiores, ninguna combina adecuadamente con los pantalones disponibles para una ocasión 'elegante sport'."
    *   El razonamiento es OBLIGATORIO, incluso si 'outfitSuggestion' está vacío o incompleto.

Formato de Salida: Devuelve tu respuesta en el formato JSON especificado por el esquema de salida. Asegúrate de que cada objeto dentro de 'outfitSuggestion' (si existe) contenga el 'id' de la prenda original del armario. Todas las respuestas deben ser en ESPAÑOL.
Recuerda, la COHERENCIA del atuendo, la DEVOLUCIÓN CORRECTA DE LOS 'id', la VARIEDAD en sugerencias sucesivas para la misma ocasión y la CALIDAD del razonamiento son clave.
`,
});


const suggestOutfitFlow = ai.defineFlow(
  {
    name: 'suggestOutfitFlow',
    inputSchema: SuggestOutfitInputSchema,
    outputSchema: SuggestOutfitOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Asegurarse de que siempre haya un razonamiento, incluso si es genérico y la IA falla en proporcionarlo.
    if (!output) {
        return {
            reasoning: "La IA no pudo procesar la solicitud esta vez. Por favor, inténtalo de nuevo."
        };
    }
    if (!output.reasoning) {
        output.reasoning = "La IA no proporcionó un razonamiento específico."
        if (!output.outfitSuggestion || output.outfitSuggestion.length === 0) {
             output.reasoning = "La IA no pudo formar un atuendo con las prendas disponibles y no proporcionó un razonamiento específico. Intenta con otra ocasión o añade más prendas a tu armario."
        }
    }
    // Asegurar que outfitSuggestion sea un array si es undefined pero hay razonamiento
    if (output.reasoning && typeof output.outfitSuggestion === 'undefined') {
      output.outfitSuggestion = [];
    }
    return output;
  }
);

