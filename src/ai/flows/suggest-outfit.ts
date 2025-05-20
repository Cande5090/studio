
// src/ai/flows/suggest-outfit.ts
'use server';

/**
 * @fileOverview Outfit suggestion flow. Allows users to get outfit suggestions
 *
 * - suggestOutfit - A function that suggests an outfit.
 * - SuggestOutfitInput - The input type for the suggestOutfit function.
 * - SuggestOutfitOutput - The return type for the suggestOutfit function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Schema for individual wardrobe items sent to the AI
const WardrobeItemForAISchema = z.object({
  id: z.string().describe('The unique ID of the clothing item.'),
  type: z.string().describe('The type of clothing item (e.g., shirt, pants, dress).'),
  color: z.string().describe('The color of the clothing item.'),
  season: z.string().describe('The season the item is most suited for.'),
  material: z.string().describe('The material of the clothing item.'),
  // imageUrl is intentionally omitted here; AI will use ID to refer to items.
});

const SuggestOutfitInputSchema = z.object({
  occasion: z.string().describe('The occasion for which to suggest an outfit.'),
  wardrobe: z
    .array(WardrobeItemForAISchema)
    .describe("The user's wardrobe items, each with an ID and attributes. The AI should use the ID to refer to items."),
});
export type SuggestOutfitInput = z.infer<typeof SuggestOutfitInputSchema>;

// Schema for items returned by the AI as part of the suggestion
const SuggestedItemSchema = z.object({
  id: z.string().describe("The ID of the clothing item selected from the user's wardrobe. This ID MUST match one of the IDs from the input wardrobe list."),
  type: z.string().describe('The type of clothing item (e.g., shirt, pants, dress), copied or inferred.').optional(),
  color: z.string().describe('The color of the clothing item, copied or inferred.').optional(),
  season: z.string().describe('The season the item is most suited for, copied or inferred.').optional(),
  material: z.string().describe('The material of the clothing item, copied or inferred.').optional(),
  // AI does not return imageUrl; client reconstructs it using the ID.
});

const SuggestOutfitOutputSchema = z.object({
  outfitSuggestion: z
    .array(SuggestedItemSchema)
    .describe("An array of clothing items selected from the user's wardrobe. Each item MUST include its original 'id'. Other fields like 'type', 'color' are helpful if returned.")
    .optional(),
  reasoning: z.string().describe('The reasoning behind the outfit suggestion. This field is mandatory.').optional(),
});
export type SuggestOutfitOutput = z.infer<typeof SuggestOutfitOutputSchema>;

export async function suggestOutfit(input: SuggestOutfitInput): Promise<SuggestOutfitOutput> {
  return suggestOutfitFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestOutfitPrompt',
  input: {schema: SuggestOutfitInputSchema},
  output: {schema: SuggestOutfitOutputSchema},
  prompt: `Eres un estilista de moda experto. Dada la siguiente lista de prendas del armario del usuario y una ocasión específica, tu tarea es sugerir un atuendo completo.

Ocasión: {{{occasion}}}

Prendas disponibles en el armario del usuario (Presta atención a los detalles exactos de cada prenda, especialmente el 'id'):
{{#each wardrobe}}
- Prenda: ID={{id}}, Tipo={{type}}, Color={{color}}, Temporada={{season}}, Material={{material}}
{{/each}}

Instrucciones MUY IMPORTANTES:
1.  Selecciona prendas ÚNICAMENTE de la lista proporcionada arriba.
2.  Para CADA PRENDA que incluyas en tu 'outfitSuggestion', DEBES devolver su 'id' original de la lista de arriba. Adicionalmente, es útil si incluyes 'type', 'color', 'season', y 'material' copiados de la prenda original.
3.  NO incluyas 'imageUrl' en tu respuesta. El cliente se encargará de buscar la imagen usando el 'id'.
4.  Proporciona SIEMPRE un 'reasoning' (razonamiento) explicando por qué elegiste esas prendas para la ocasión.
5.  Si no puedes formar un atuendo adecuado con las prendas disponibles, devuelve un array vacío para 'outfitSuggestion' pero AÚN ASÍ incluye un 'reasoning' explicando por qué no fue posible.

Devuelve tu respuesta en el formato JSON especificado por el esquema de salida. Asegúrate de que cada objeto dentro de 'outfitSuggestion' contenga el 'id' de la prenda original del armario.
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
    return output!;
  }
);
