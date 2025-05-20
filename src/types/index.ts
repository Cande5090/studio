
export interface ClothingItem {
  id: string;
  userId: string;
  name: string;
  type: string; // e.g., 'Shirt', 'Pants', 'Dress'
  color: string;
  season: string; // e.g., 'Summer', 'Winter', 'All year'
  fabric: string; // e.g., 'Cotton', 'Wool', 'Polyester'
  imageUrl: string; // Can be data URI or placeholder URL
  createdAt: Date;
  updatedAt?: Date; 
}

export interface Outfit {
  id: string;
  userId: string;
  name: string;
  description?: string;
  itemIds: string[]; // Array of ClothingItem IDs
  createdAt: Date;
  updatedAt?: Date;
}

// Used for displaying outfits with their full item details
export interface OutfitWithItems extends Outfit {
  items: ClothingItem[];
}


export interface WardrobeItemForAI {
  imageUrl: string;
  type: string;
  color: string;
  season: string;
  material: string; // Maps to 'fabric' in ClothingItem
}
