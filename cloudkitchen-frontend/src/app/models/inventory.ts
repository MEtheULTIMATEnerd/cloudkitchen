// src/app/models/inventory.ts
export type InventoryCategory =
  | 'Produce' | 'Dairy' | 'Meat' | 'Seafood' | 'Dry Goods'
  | 'Spices' | 'Condiments' | 'Beverages' | 'Frozen' | 'Other';

export interface InventoryItem {
  inventoryId?: string;
  itemId?: string;
  userId?: string;

  ingredientName: string;
  quantity: number;
  unit: string;
  category: InventoryCategory | string;
  purchaseDate: string;
  expirationDate: string;
  location: string;
  cost: number;
  createdDate?: string;
}