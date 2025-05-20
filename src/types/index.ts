
export interface ClothingItem {
  id: string;
  userId: string;
  name: string;
  type: string; // e.g., 'Shirt', 'Pants', 'Dress'
  color: string;
  season: string; // e.g., 'Summer', 'Winter', 'All year'
  fabric: string; // e.g., 'Cotton', 'Wool', 'Polyester'
  imageUrl: string;
  createdAt: Date;
}

export interface Outfit {
  id: string;
  userId: string;
  name: string;
  description?: string;
  itemIds: string[]; // Array of ClothingItem IDs
  occasion?: string; // For AI generated outfits or manual tagging
  createdAt: Date;
}

export interface WardrobeItemForAI {
  imageUrl: string;
  type: string;
  color: string;
  season: string;
  material: string; // Maps to 'fabric' in ClothingItem
}
