
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

const SuggestOutfitOutputSchema = z.object({
  outfitSuggestion: z
    .array(
      z.object({
        imageUrl: z.string().describe('URL of the clothing item image.'),
        type: z.string().describe('The type of clothing item (e.g., shirt, pants, dress).'),
        color: z.string().describe('The color of the clothing item.'),
        season: z.string().describe('The season the item is most suited for.'),
        material: z.string().describe('The material of the clothing item.'),
      })
    )
    .describe('An array of clothing items suggested for the outfit.')
    .optional(), // Made optional
  reasoning: z.string().describe('The reasoning behind the outfit suggestion.').optional(), // Made optional
});
export type SuggestOutfitOutput = z.infer<typeof SuggestOutfitOutputSchema>;

export async function suggestOutfit(input: SuggestOutfitInput): Promise<SuggestOutfitOutput> {
  return suggestOutfitFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestOutfitPrompt',
  input: {schema: SuggestOutfitInputSchema},
  output: {schema: SuggestOutfitOutputSchema},
  prompt: `Given the user's wardrobe and the specified occasion, suggest an outfit.

Occasion: {{{occasion}}}

Wardrobe:
{{#each wardrobe}}
- Type: {{type}}, Color: {{color}}, Season: {{season}}, Material: {{material}}, Image URL: {{imageUrl}}
{{/each}}

Consider the occasion and the characteristics of each clothing item in the wardrobe to create a suitable outfit. Provide the reasoning for the suggested outfit.

Output the outfit suggestion as an array of clothing items selected from the user's wardrobe and the reasoning behind the outfit suggestion.
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

