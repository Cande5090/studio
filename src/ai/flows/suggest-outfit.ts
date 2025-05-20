
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

const SuggestOutfitInputSchema = z.object({
  occasion: z.string().describe('The occasion for which to suggest an outfit.'),
  wardrobe: z
    .array(
      z.object({
        // Make sure all fields here match what's sent from the frontend
        id: z.string().optional().describe('The unique ID of the clothing item.'), // Added optional ID
        imageUrl: z.string().describe('URL of the clothing item image.'),
        type: z.string().describe('The type of clothing item (e.g., shirt, pants, dress).'),
        color: z.string().describe('The color of the clothing item.'),
        season: z.string().describe('The season the item is most suited for.'),
        material: z.string().describe('The material of the clothing item.'),
      })
    )
    .describe('The user wardrobe items.'),
});
export type SuggestOutfitInput = z.infer<typeof SuggestOutfitInputSchema>;

const SuggestedItemSchema = z.object({
  // Ensure these fields are included in the prompt and AI is instructed to return them
  // Matching the fields from WardrobeItemForAI and what the display component expects
  imageUrl: z.string().describe('URL of the clothing item image. Must be from the provided wardrobe item.').optional(),
  type: z.string().describe('The type of clothing item (e.g., shirt, pants, dress). Must be from the provided wardrobe item.').optional(),
  color: z.string().describe('The color of the clothing item. Must be from the provided wardrobe item.').optional(),
  season: z.string().describe('The season the item is most suited for. Must be from the provided wardrobe item.').optional(),
  material: z.string().describe('The material of the clothing item. Must be from the provided wardrobe item.').optional(),
  // We are not asking the AI for ID here, as it might confuse it if it's generating suggestions.
  // The AI should describe the item based on the input.
});

const SuggestOutfitOutputSchema = z.object({
  outfitSuggestion: z
    .array(SuggestedItemSchema)
    .describe('An array of clothing items selected from the user\'s wardrobe for the outfit. Each item MUST include imageUrl, type, color, season, and material, copied exactly from the input wardrobe for the selected items.')
    .optional(),
  reasoning: z.string().describe('The reasoning behind the outfit suggestion. This field is mandatory.').optional(), // Made optional to prevent validation errors
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

Prendas disponibles en el armario del usuario:
{{#each wardrobe}}
- Prenda: Tipo={{type}}, Color={{color}}, Temporada={{season}}, Material={{material}}, URL de Imagen={{imageUrl}}
{{/each}}

Instrucciones importantes:
1.  Selecciona prendas ÚNICAMENTE de la lista proporcionada arriba.
2.  Para CADA PRENDA que incluyas en tu 'outfitSuggestion', DEBES devolver EXACTAMENTE los mismos campos: 'imageUrl', 'type', 'color', 'season' y 'material' que tenía esa prenda en la lista del armario del usuario. NO omitas ni alteres estos detalles para las prendas seleccionadas.
3.  Proporciona SIEMPRE un 'reasoning' (razonamiento) explicando por qué elegiste esas prendas para la ocasión. Este campo es obligatorio.
4.  Si no puedes formar un atuendo adecuado con las prendas disponibles, devuelve un array vacío para 'outfitSuggestion' pero AÚN ASÍ incluye un 'reasoning' explicando por qué no fue posible.

Devuelve tu respuesta en el formato JSON especificado por el esquema de salida.
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
