
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
  name: z.string().describe('Un nombre descriptivo y específico para la prenda (ej. Camisa de lino a rayas, Pantalón vaquero desgastado, Zapatillas urbanas blancas).'),
  type: z.string().describe('La categoría general de la prenda (ej. Prendas superiores, Prendas inferiores, Entero, Abrigos, Zapatos, Accesorios, Otros). Trata de ser específico dentro de estas categorías si es posible, pero el valor DEBE ser uno de estos.'),
  color: z.string().describe('El color principal de la prenda (ej. Azul marino, Rojo vibrante, Estampado floral).'),
  season: z.string().describe('La temporada o estación para la que es más adecuada la prenda. Debe ser uno de: Primavera, Verano, Otoño, Invierno, Para todo el año.'),
  fabric: z.string().describe('El tejido principal de la prenda (ej. Algodón, Seda, Poliéster, Lino, Lana).'),
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
  prompt: `Eres un asistente de IA experto en analizar imágenes de prendas de vestir y sugerir detalles sobre ellas. Todas tus respuestas deben ser en ESPAÑOL.

Tu tarea es analizar la siguiente imagen y proporcionar la siguiente información para los CINCO campos siguientes:
1.  **Nombre**: Un nombre descriptivo y específico para la prenda basado en su apariencia (ej. Camisa de lino a rayas, Pantalón vaquero desgastado, Zapatillas urbanas blancas).
2.  **Tipo**: La categoría general de la prenda. **Este campo es OBLIGATORIO. Debes seleccionar OBLIGATORIAMENTE uno de los siguientes valores exactos: "Prendas superiores", "Prendas inferiores", "Entero", "Abrigos", "Zapatos", "Accesorios", "Otros"**. No inventes otros valores.
3.  **Color**: El color predominante de la prenda (ej. Azul marino, Rojo vibrante, Blanco, Negro, Beige, Estampado floral).
4.  **Temporada**: La temporada o estación para la que es más adecuada la prenda. **Este campo es OBLIGATORIO. Debes seleccionar OBLIGATORIAMENTE uno de los siguientes valores exactos: "Primavera", "Verano", "Otoño", "Invierno", "Para todo el año"**. No inventes otros valores.
5.  **Tejido**: El tejido principal de la prenda (ej. Algodón, Seda, Poliéster, Lino, Lana, Denim, Cuero Sintético).

**NO OMITAS NINGÚN CAMPO. Proporciona un valor para nombre, tipo, color, temporada y tejido.**
Asegúrate de que tu respuesta incluya los cinco campos y que los campos 'tipo' y 'temporada' sean estrictamente uno de los valores listados anteriormente.

Imagen: {{media url=photoDataUri}}

Por favor, devuelve la información estructurada según el esquema de salida. Recuerda, todas las respuestas en ESPAÑOL.
Para el campo 'temporada', reitero una vez más, es crucial que elijas solo entre: "Primavera", "Verano", "Otoño", "Invierno", "Para todo el año".
Para el campo 'tipo', reitero una vez más, es crucial que elijas solo entre: "Prendas superiores", "Prendas inferiores", "Entero", "Abrigos", "Zapatos", "Accesorios", "Otros".`,
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
