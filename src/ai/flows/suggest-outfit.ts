
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
});
export type SuggestOutfitInput = z.infer<typeof SuggestOutfitInputSchema>;

// Esquema para las prendas devueltas por la IA como parte de la sugerencia
const SuggestedItemSchema = z.object({
  id: z.string().describe("El ID de la prenda seleccionada del armario del usuario. Este ID DEBE coincidir con uno de los IDs de la lista de prendas del armario de entrada."),
  type: z.string().describe('El tipo de prenda (ej. camisa, pantalón, vestido), copiado o inferido.').optional(),
  color: z.string().describe('El color de la prenda, copiado o inferido.').optional(),
  season: z.string().describe('La temporada para la que la prenda es más adecuada, copiada o inferida.').optional(),
  material: z.string().describe('El material de la prenda, copiado o inferido.').optional(),
  // La IA no devuelve imageUrl; el cliente la reconstruye usando el ID.
});

const SuggestOutfitOutputSchema = z.object({
  outfitSuggestion: z
    .array(SuggestedItemSchema)
    .describe("Un array de prendas seleccionadas del armario del usuario. Cada prenda DEBE incluir su 'id' original. Otros campos como 'type', 'color' son útiles si se devuelven.")
    .optional(), // Opcional para manejar casos donde no se puede sugerir nada
  reasoning: z.string().describe('El razonamiento detrás de la sugerencia del atuendo. Este campo es obligatorio, incluso si no se sugiere ningún atuendo.'),
});
export type SuggestOutfitOutput = z.infer<typeof SuggestOutfitOutputSchema>;

export async function suggestOutfit(input: SuggestOutfitInput): Promise<SuggestOutfitOutput> {
  return suggestOutfitFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestOutfitPrompt',
  input: {schema: SuggestOutfitInputSchema},
  output: {schema: SuggestOutfitOutputSchema},
  prompt: `Eres un estilista de moda experto en español. Dada la siguiente lista de prendas del armario del usuario y una ocasión específica, tu tarea es sugerir un atuendo completo.

Ocasión: {{{occasion}}}

Prendas disponibles en el armario del usuario (Presta atención a los detalles exactos de cada prenda, especialmente el 'id', 'type', 'color', 'season' y 'material'):
{{#each wardrobe}}
- Prenda: ID={{id}}, Tipo={{type}}, Color={{color}}, Temporada={{season}}, Material={{material}}
{{/each}}

Instrucciones MUY IMPORTANTES:
1.  Selecciona prendas ÚNICAMENTE de la lista proporcionada arriba.
2.  Para CADA PRENDA que incluyas en tu 'outfitSuggestion', DEBES devolver su 'id' original de la lista de arriba. Adicionalmente, es útil si incluyes 'type', 'color', 'season', y 'material' copiados o inferidos de la prenda original.
3.  NO incluyas 'imageUrl' en tu respuesta. El cliente se encargará de buscar la imagen usando el 'id'.
4.  Proporciona SIEMPRE un 'reasoning' (razonamiento) en español explicando por qué elegiste esas prendas para la ocasión.
5.  Si no puedes formar un atuendo adecuado con las prendas disponibles, devuelve un array vacío (o no incluyas el campo 'outfitSuggestion') pero AÚN ASÍ incluye un 'reasoning' explicando por qué no fue posible y, si aplica, qué tipo de prendas podrían faltar para completar un atuendo para la ocasión (ej. 'No se pudo formar un atuendo de gala porque no se encontraron zapatos formales en el armario.' o 'Para un día de invierno, faltaría una chaqueta abrigada.'). El razonamiento es obligatorio.

Devuelve tu respuesta en el formato JSON especificado por el esquema de salida. Asegúrate de que cada objeto dentro de 'outfitSuggestion' (si existe) contenga el 'id' de la prenda original del armario. Todas las respuestas deben ser en ESPAÑOL.
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
            reasoning: "La IA no pudo procesar la solicitud esta vez."
        };
    }
    if (!output.reasoning) {
        output.reasoning = "La IA no proporcionó un razonamiento específico, pero aquí están las prendas sugeridas."
        if (!output.outfitSuggestion || output.outfitSuggestion.length === 0) {
             output.reasoning = "La IA no pudo formar un atuendo con las prendas disponibles y no proporcionó un razonamiento específico."
        }
    }
    return output;
  }
);
