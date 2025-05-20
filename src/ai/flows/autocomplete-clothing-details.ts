// Autocomplete clothing details flow.
'use server';

/**
 * @fileOverview A flow that uses AI to automatically suggest clothing details based on an image.
 *
 * - autocompleteClothingDetails - A function that handles the clothing details auto-completion process.
 * - AutocompleteClothingDetailsInput - The input type for the autocompleteClothingDetails function.
 * - AutocompleteClothingDetailsOutput - The return type for the autocompleteClothingDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutocompleteClothingDetailsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a clothing item, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AutocompleteClothingDetailsInput = z.infer<
  typeof AutocompleteClothingDetailsInputSchema
>;

const AutocompleteClothingDetailsOutputSchema = z.object({
  type: z.string().describe('The type of clothing item (e.g., shirt, dress, pants).'),
  color: z.string().describe('The color of the clothing item.'),
  season: z.string().describe('The season the clothing item is best suited for (e.g., summer, winter, fall, spring).'),
  fabric: z.string().describe('The fabric of the clothing item (e.g., cotton, silk, polyester).'),
});
export type AutocompleteClothingDetailsOutput = z.infer<
  typeof AutocompleteClothingDetailsOutputSchema
>;

export async function autocompleteClothingDetails(
  input: AutocompleteClothingDetailsInput
): Promise<AutocompleteClothingDetailsOutput> {
  return autocompleteClothingDetailsFlow(input);
}

const autocompleteClothingDetailsPrompt = ai.definePrompt({
  name: 'autocompleteClothingDetailsPrompt',
  input: {schema: AutocompleteClothingDetailsInputSchema},
  output: {schema: AutocompleteClothingDetailsOutputSchema},
  prompt: `You are an AI assistant that analyzes images of clothing items and suggests details about them.

  Analyze the following image and provide the type, color, season, and fabric of the clothing item.

  Image: {{media url=photoDataUri}}

  Type: The type of clothing item (e.g., shirt, dress, pants).
  Color: The color of the clothing item.
  Season: The season the clothing item is best suited for (e.g., summer, winter, fall, spring).
  Fabric: The fabric of the clothing item (e.g., cotton, silk, polyester).`,
});

const autocompleteClothingDetailsFlow = ai.defineFlow(
  {
    name: 'autocompleteClothingDetailsFlow',
    inputSchema: AutocompleteClothingDetailsInputSchema,
    outputSchema: AutocompleteClothingDetailsOutputSchema,
  },
  async input => {
    const {output} = await autocompleteClothingDetailsPrompt(input);
    return output!;
  }
);
