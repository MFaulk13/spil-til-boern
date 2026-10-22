import { text } from '@/game/text';
import { createFullNeeds, type EggPattern, type PetId, type PetState } from '@/game/types';

export type PetVoice =
  | 'bark'
  | 'meow'
  | 'neigh'
  | 'chirp'
  | 'splash'
  | 'bubble'
  | 'oink'
  | 'cluck'
  | 'squeak'
  | 'tweet'
  | 'quack'
  | 'hoot'
  | 'ribbit';

export type PetMotion = 'walk' | 'hop' | 'swim' | 'float';

export interface PetDefinition {
  id: PetId;
  label: string;
  assetKey: string;
  eggTint: number;
  eggPattern: EggPattern;
  names: readonly string[];
  voice: PetVoice;
  motion: PetMotion;
  adoptionPrice: number;
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
    motion: 'walk',
    adoptionPrice: 35,
  },
  {
    id: 'cat',
    label: text.pets.species.cat,
    assetKey: 'pet-cat',
    eggTint: 0xaab8c7,
    eggPattern: 'stripes',
    names: text.pets.names.cat,
    voice: 'meow',
    motion: 'walk',
    adoptionPrice: 35,
  },
  {
    id: 'rabbit',
    label: text.pets.species.rabbit,
    assetKey: 'pet-rabbit',
    eggTint: 0xf4dfe6,
    eggPattern: 'waves',
    names: text.pets.names.rabbit,
    voice: 'chirp',
    motion: 'hop',
    adoptionPrice: 30,
  },
  {
    id: 'pig',
    label: text.pets.species.pig,
    assetKey: 'pet-pig',
    eggTint: 0xf6a9c4,
    eggPattern: 'waves',
    names: text.pets.names.pig,
    voice: 'oink',
    motion: 'walk',
    adoptionPrice: 30,
  },
  {
    id: 'chicken',
    label: text.pets.species.chicken,
    assetKey: 'pet-chicken',
    eggTint: 0xf9d76f,
    eggPattern: 'spots',
    names: text.pets.names.chicken,
    voice: 'cluck',
    motion: 'hop',
    adoptionPrice: 20,
  },
  {
    id: 'hamster',
    label: text.pets.species.hamster,
    assetKey: 'pet-hamster',
    eggTint: 0xe8b56a,
    eggPattern: 'spots',
    names: text.pets.names.hamster,
    voice: 'squeak',
    motion: 'hop',
    adoptionPrice: 25,
  },
  {
    id: 'mouse',
    label: text.pets.species.mouse,
    assetKey: 'pet-mouse',
    eggTint: 0xb9b4ad,
    eggPattern: 'spots',
    names: text.pets.names.mouse,
    voice: 'squeak',
    motion: 'hop',
    adoptionPrice: 20,
  },
  {
    id: 'hedgehog',
    label: text.pets.species.hedgehog,
    assetKey: 'pet-hedgehog',
    eggTint: 0x9a7454,
    eggPattern: 'stripes',
    names: text.pets.names.hedgehog,
    voice: 'chirp',
    motion: 'walk',
    adoptionPrice: 30,
  },
  {
    id: 'duck',
    label: text.pets.species.duck,
    assetKey: 'pet-duck',
    eggTint: 0xf7d76a,
    eggPattern: 'waves',
    names: text.pets.names.duck,
    voice: 'quack',
    motion: 'walk',
    adoptionPrice: 25,
  },
  {
    id: 'parrot',
    label: text.pets.species.parrot,
    assetKey: 'pet-parrot',
    eggTint: 0x6fc38a,
    eggPattern: 'stripes',
    names: text.pets.names.parrot,
    voice: 'tweet',
    motion: 'hop',
    adoptionPrice: 40,
  },
  {
    id: 'owl',
    label: text.pets.species.owl,
    assetKey: 'pet-owl',
    eggTint: 0xb79a74,
    eggPattern: 'spots',
    names: text.pets.names.owl,
    voice: 'hoot',
    motion: 'hop',
    adoptionPrice: 45,
  },
  {
    id: 'frog',
    label: text.pets.species.frog,
    assetKey: 'pet-frog',
    eggTint: 0x8fcb88,
    eggPattern: 'waves',
    names: text.pets.names.frog,
    voice: 'ribbit',
    motion: 'hop',
    adoptionPrice: 20,
  },
  {
    id: 'turtle',
    label: text.pets.species.turtle,
    assetKey: 'pet-turtle',
    eggTint: 0x8fcb88,
    eggPattern: 'spots',
    names: text.pets.names.turtle,
    voice: 'bubble',
    motion: 'hop',
    adoptionPrice: 40,
  },
  {
    id: 'axolotl',
    label: text.pets.species.axolotl,
    assetKey: 'pet-axolotl',
    eggTint: 0xf6a9ca,
    eggPattern: 'stripes',
    names: text.pets.names.axolotl,
    voice: 'bubble',
    motion: 'float',
    adoptionPrice: 50,
  },
  {
    id: 'fish',
    label: text.pets.species.fish,
    assetKey: 'pet-fish',
    eggTint: 0xff9f70,
    eggPattern: 'waves',
    names: text.pets.names.fish,
    voice: 'splash',
    motion: 'swim',
    adoptionPrice: 20,
  },
  {
    id: 'horse',
    label: text.pets.species.horse,
    assetKey: 'pet-horse',
    eggTint: 0xb27c50,
    eggPattern: 'stripes',
    names: text.pets.names.horse,
    voice: 'neigh',
    motion: 'walk',
    adoptionPrice: 60,
  },
  {
    id: 'gecko',
    label: text.pets.species.gecko,
    assetKey: 'pet-gecko',
    eggTint: 0x9bcf7f,
    eggPattern: 'spots',
    names: text.pets.names.gecko,
    voice: 'chirp',
    motion: 'walk',
    adoptionPrice: 45,
  },
  {
    id: 'penguin',
    label: text.pets.species.penguin,
    assetKey: 'pet-penguin',
    eggTint: 0x7fb3d5,
    eggPattern: 'stripes',
    names: text.pets.names.penguin,
    voice: 'chirp',
    motion: 'walk',
    adoptionPrice: 55,
  },
];

export function getPet(id: PetId): PetDefinition {
  const pet = PETS.find((entry) => entry.id === id);
  if (!pet) {
    throw new Error(`Unknown pet: ${id}`);
  }
  return pet;
}

let petUidCounter = 0;

export function createPetUid(): string {
  petUidCounter += 1;
  return `pet-${Date.now().toString(36)}-${petUidCounter.toString(36)}`;
}

export function createPetState(
  id: PetId,
  name: string,
  now = Date.now(),
  uid = createPetUid(),
): PetState {
  return {
    uid,
    id,
    name,
    needs: createFullNeeds(),
    bond: 0,
    hatchedAt: now,
    accessory: null,
  };
}

export function getPetNames(id: PetId): readonly string[] {
  return getPet(id).names;
}

export function pickNewPetName(id: PetId, usedNames: readonly string[]): string {
  const names = getPet(id).names;
  const used = new Set(usedNames.map((name) => name.trim().toLowerCase()));
  return (
    names.find((name) => !used.has(name.toLowerCase())) ?? `${getPet(id).label} ${used.size + 1}`
  );
}
