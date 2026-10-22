import { text } from '@/game/text';
import { createFullNeeds, type EggPattern, type PetId, type PetState } from '@/game/types';

export type PetVoice = 'bark' | 'meow' | 'neigh' | 'chirp' | 'splash' | 'bubble';

export interface PetDefinition {
  id: PetId;
  label: string;
  assetKey: string;
  eggTint: number;
  eggPattern: EggPattern;
  names: readonly string[];
  voice: PetVoice;
}

export const PETS: readonly PetDefinition[] = [
  {
    id: 'dog',
    label: text.pets.species.dog,
    assetKey: 'pet-dog',
    eggTint: 0xf0b56b,
    eggPattern: 'spots',
    names: text.pets.names.dog,
    voice: 'bark',
  },
  {
    id: 'puppy',
    label: text.pets.species.puppy,
    assetKey: 'pet-puppy',
    eggTint: 0xf8ca8f,
    eggPattern: 'waves',
    names: text.pets.names.puppy,
    voice: 'bark',
  },
  {
    id: 'cat',
    label: text.pets.species.cat,
    assetKey: 'pet-cat',
    eggTint: 0xaab8c7,
    eggPattern: 'stripes',
    names: text.pets.names.cat,
    voice: 'meow',
  },
  {
    id: 'kitten',
    label: text.pets.species.kitten,
    assetKey: 'pet-kitten',
    eggTint: 0xd4dee8,
    eggPattern: 'spots',
    names: text.pets.names.kitten,
    voice: 'meow',
  },
  {
    id: 'rabbit',
    label: text.pets.species.rabbit,
    assetKey: 'pet-rabbit',
    eggTint: 0xf4dfe6,
    eggPattern: 'waves',
    names: text.pets.names.rabbit,
    voice: 'chirp',
  },
  {
    id: 'horse',
    label: text.pets.species.horse,
    assetKey: 'pet-horse',
    eggTint: 0xb27c50,
    eggPattern: 'stripes',
    names: text.pets.names.horse,
    voice: 'neigh',
  },
  {
    id: 'fish',
    label: text.pets.species.fish,
    assetKey: 'pet-fish',
    eggTint: 0xff9f70,
    eggPattern: 'waves',
    names: text.pets.names.fish,
    voice: 'splash',
  },
  {
    id: 'turtle',
    label: text.pets.species.turtle,
    assetKey: 'pet-turtle',
    eggTint: 0x8fcb88,
    eggPattern: 'spots',
    names: text.pets.names.turtle,
    voice: 'bubble',
  },
  {
    id: 'axolotl',
    label: text.pets.species.axolotl,
    assetKey: 'pet-axolotl',
    eggTint: 0xf6a9ca,
    eggPattern: 'stripes',
    names: text.pets.names.axolotl,
    voice: 'bubble',
  },
];

export function getPet(id: PetId): PetDefinition {
  const pet = PETS.find((entry) => entry.id === id);
  if (!pet) {
    throw new Error(`Unknown pet: ${id}`);
  }
  return pet;
}

export function createPetState(id: PetId, name: string, now = Date.now()): PetState {
  return {
    id,
    name,
    needs: createFullNeeds(),
    bond: 0,
    hatchedAt: now,
  };
}

export function getPetNames(id: PetId): readonly string[] {
  return getPet(id).names;
}
