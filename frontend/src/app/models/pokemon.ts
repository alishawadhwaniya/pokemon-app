export interface PokemonType {
    id: string;
    name: string;
}

export interface Pokemon {
  id: string;
  name: string;
  type_id?: string;
  image: string;
  power: number;
  life: number;
  pokemon_type?: { name: string };
  selected?: boolean; // For UI selection
}

export interface Team {
  team_id: string;
  team_name: string;
  total_power: number;
  pokemons: Pokemon[];
}